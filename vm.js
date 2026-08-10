// ============================================================
// KN4GHT LUau VM / BYTECODE CORE
// Compiler-side VM used by compiler.js
// ============================================================

(function (global) {
    "use strict";

    const VERSION = 2;

    // ------------------------------------------------------------
    // Instruction set
    // ------------------------------------------------------------

    const OPCODES = Object.freeze({
        NOP: 0,

        LOADK: 1,
        MOVE: 2,

        ADD: 3,
        SUB: 4,
        MUL: 5,
        DIV: 6,
        MOD: 7,
        POW: 8,
        UNM: 9,

        EQ: 10,
        NE: 11,
        LT: 12,
        LE: 13,
        GT: 14,
        GE: 15,

        AND: 16,
        OR: 17,
        NOT: 18,

        JMP: 19,
        JMP_IF_FALSE: 20,
        JMP_IF_TRUE: 21,

        GETGLOBAL: 22,
        SETGLOBAL: 23,

        GETTABLE: 24,
        SETTABLE: 25,

        CALL: 26,
        RETURN: 27,

        NEWTABLE: 28,
        GETFIELD: 29,
        SETFIELD: 30,

        CONCAT: 31,

        PUSH: 32,
        POP: 33,

        HALT: 34
    });

    const OPCODE_NAMES = Object.freeze(
        Object.fromEntries(
            Object.entries(OPCODES).map(([name, value]) => [value, name])
        )
    );

    // ------------------------------------------------------------
    // Deterministic hashing
    // ------------------------------------------------------------

    function hashString(input) {
        input = String(input);

        let h = 2166136261;

        for (let i = 0; i < input.length; i++) {
            h ^= input.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }

        return h >>> 0;
    }

    // ------------------------------------------------------------
    // Stable key generation
    // ------------------------------------------------------------

    function deriveIndex(name, seed, used) {
        let value = hashString(String(seed) + ":" + name);

        // Keep indices small enough for normal Luau table access.
        value = (value % 0x7fffffff) + 1;

        while (used.has(value)) {
            value++;

            if (value >= 0x7fffffff) {
                value = 1;
            }
        }

        used.add(value);

        return value;
    }

    // ------------------------------------------------------------
    // Bytecode builder
    // ------------------------------------------------------------

    class BytecodeBuilder {
        constructor(options = {}) {
            this.constants = [];
            this.constantMap = new Map();

            this.instructions = [];

            this.labels = new Map();
            this.fixups = [];

            this.options = {
                seed: options.seed ?? "kn4ght",
                version: VERSION
            };

            this.usedIndices = new Set();
        }

        constant(value) {
            const key =
                typeof value + ":" + JSON.stringify(value);

            if (this.constantMap.has(key)) {
                return this.constantMap.get(key);
            }

            const index = this.constants.length;

            this.constants.push(value);
            this.constantMap.set(key, index);

            return index;
        }

        emit(op, ...args) {
            if (typeof op === "string") {
                if (!(op in OPCODES)) {
                    throw new Error("Unknown opcode: " + op);
                }

                op = OPCODES[op];
            }

            const instruction = [op, ...args];

            this.instructions.push(instruction);

            return this.instructions.length - 1;
        }

        label(name) {
            this.labels.set(name, this.instructions.length);
        }

        jump(op, labelName, ...args) {
            const index = this.emit(op, -1, ...args);

            this.fixups.push({
                instruction: index,
                argument: 1,
                label: labelName
            });

            return index;
        }

        resolve() {
            for (const fixup of this.fixups) {
                if (!this.labels.has(fixup.label)) {
                    throw new Error(
                        "Unknown bytecode label: " + fixup.label
                    );
                }

                this.instructions[fixup.instruction][fixup.argument] =
                    this.labels.get(fixup.label);
            }

            this.fixups.length = 0;

            return this;
        }

        numericIndex(name) {
            return deriveIndex(
                name,
                this.options.seed,
                this.usedIndices
            );
        }

        build(metadata = {}) {
            this.resolve();

            return {
                version: this.options.version,

                constants: this.constants.slice(),

                instructions: this.instructions.map(
                    instruction => instruction.slice()
                ),

                metadata: {
                    ...metadata
                }
            };
        }
    }

    // ------------------------------------------------------------
    // VM function representation
    // ------------------------------------------------------------

    class VMFunction {
        constructor(bytecode, options = {}) {
            this.type = "MV_VM_FUNCTION";

            this.bytecode = bytecode;

            this.name = options.name || null;
            this.parameters = options.parameters || [];

            this.sourceLine = options.sourceLine ?? null;

            this.flags = {
                virtualized: true,
                cff: false,
                encrypted: false
            };
        }
    }

    // ------------------------------------------------------------
    // Macro registry
    // ------------------------------------------------------------

    const MACROS = Object.freeze({
        MV_VM: "MV_VM",
        MV_CFF: "MV_CFF",
        MV_ENC_FUNC: "MV_ENC_FUNC",
        MV_ENC_STR: "MV_ENC_STR",
        MV_INDEX_TO_NUM: "MV_INDEX_TO_NUM",
        MV_OBFUSCATED: "MV_OBFUSCATED",
        MV_CRASH: "MV_CRASH",
        MV_OMIT: "MV_OMIT",
        MV_INLINE: "MV_INLINE",
        MV_LINE: "MV_LINE",
        MV_COMPRESS: "MV_COMPRESS",

        LPH_OBFUSCATED: "LPH_OBFUSCATED",
        LPH_LINE: "LPH_LINE",
        LPH_CRASH: "LPH_CRASH",
        LPH_NO_VIRTUALIZE: "LPH_NO_VIRTUALIZE",
        LPH_ENCFUNC: "LPH_ENCFUNC",
        LPH_ENCSTR: "LPH_ENCSTR",
        LPH_ENCNUM: "LPH_ENCNUM",
        LPH_JIT: "LPH_JIT",
        LPH_NO_UPVALUES: "LPH_NO_UPVALUES"
    });

    const ALIASES = Object.freeze({
        LPH_OBFUSCATED: "MV_OBFUSCATED",
        LPH_LINE: "MV_LINE",
        LPH_CRASH: "MV_CRASH",
        LPH_NO_VIRTUALIZE: "MV_OMIT",
        LPH_ENCFUNC: "MV_ENC_FUNC"
    });

    const COMPAT_NOOPS = new Set([
        "LPH_ENCSTR",
        "LPH_ENCNUM",
        "LPH_JIT",
        "LPH_NO_UPVALUES"
    ]);

    // ------------------------------------------------------------
    // Macro normalization
    // ------------------------------------------------------------

    function normalizeMacro(name) {
        name = String(name);

        if (ALIASES[name]) {
            return ALIASES[name];
        }

        return name;
    }

    function isMacro(name) {
        return Object.prototype.hasOwnProperty.call(
            MACROS,
            name
        );
    }

    function isCompatibilityNoop(name) {
        return COMPAT_NOOPS.has(name);
    }

    // ------------------------------------------------------------
    // Comment directive parser
    // ------------------------------------------------------------

    function parseDirective(line) {
        if (typeof line !== "string") {
            return null;
        }

        const match = line.match(
            /^\s*--!mv:([a-z_]+)(?:\s+(.*?))?\s*$/
        );

        if (!match) {
            return null;
        }

        const rawName = "MV_" + match[1].toUpperCase();

        const argumentText = match[2] || "";

        const args = argumentText
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(value => {
                if (value === "true") return true;
                if (value === "false") return false;

                const number = Number(value);

                return Number.isFinite(number)
                    ? number
                    : value;
            });

        return {
            name: normalizeMacro(rawName),
            args
        };
    }

    // ------------------------------------------------------------
    // Function metadata
    // ------------------------------------------------------------

    class FunctionInfo {
        constructor(options = {}) {
            this.name = options.name || null;

            this.line =
                Number.isFinite(options.line)
                    ? options.line
                    : null;

            this.parameters =
                Array.isArray(options.parameters)
                    ? options.parameters.slice()
                    : [];

            this.body = options.body || "";

            this.macros = new Set();

            this.omit = false;
            this.inline = false;

            this.vm = false;
            this.cff = false;
            this.encFunc = false;

            this.cffOptions = {
                decompose: false,
                mangleExpr: false,
                cfManglePercent: 0
            };
        }

        applyMacro(name, args = []) {
            name = normalizeMacro(name);

            switch (name) {
                case "MV_VM":
                    this.vm = true;
                    break;

                case "MV_CFF":
                    this.cff = true;

                    this.cffOptions.decompose =
                        args[0] === true;

                    this.cffOptions.mangleExpr =
                        args[1] === true;

                    if (typeof args[2] === "number") {
                        this.cffOptions.cfManglePercent =
                            Math.max(
                                0,
                                Math.min(100, args[2])
                            );
                    }

                    break;

                case "MV_ENC_FUNC":
                    this.encFunc = true;
                    break;

                case "MV_OMIT":
                    this.omit = true;

                    // Explicit omit wins over protection.
                    this.vm = false;
                    this.cff = false;
                    this.encFunc = false;

                    break;

                case "MV_INLINE":
                    this.inline = true;
                    break;
            }

            this.macros.add(name);
        }
    }

    // ------------------------------------------------------------
    // CFF state-machine helper
    //
    // This produces an intermediate representation only.
    // compiler.js is responsible for converting the IR into Luau.
    // ------------------------------------------------------------

    function createCFFPlan(options = {}) {
        const decompose = options.decompose === true;

        const mangleExpr =
            options.mangleExpr === true;

        const percent =
            Math.max(
                0,
                Math.min(
                    100,
                    Number(options.cfManglePercent) || 0
                )
            );

        return {
            type: "CFF_PLAN",

            decompose,
            mangleExpr,
            cfManglePercent: percent,

            states: [],

            fakeBranchCount: Math.floor(percent / 10)
        };
    }

    // ------------------------------------------------------------
    // String encoding helper
    //
    // This is intentionally an encoding primitive, not a claim of
    // cryptographic security. The runtime implementation can decode
    // the generated representation.
    // ------------------------------------------------------------

    function xorBytes(bytes, key) {
        const keyBytes =
            new TextEncoder().encode(String(key));

        if (keyBytes.length === 0) {
            throw new Error("Encryption key cannot be empty");
        }

        const output = new Uint8Array(bytes.length);

        for (let i = 0; i < bytes.length; i++) {
            output[i] =
                bytes[i] ^
                keyBytes[i % keyBytes.length];
        }

        return output;
    }

    function bytesToBase64(bytes) {
        let binary = "";

        const chunk = 0x8000;

        for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode(
                ...bytes.subarray(i, i + chunk)
            );
        }

        return btoa(binary);
    }

    function encodeString(value, key) {
        const bytes =
            new TextEncoder().encode(String(value));

        const encrypted =
            xorBytes(bytes, key);

        return bytesToBase64(encrypted);
    }

    // ------------------------------------------------------------
    // Public encoder helpers
    // ------------------------------------------------------------

    function encodeFunctionPlaceholder(source, options = {}) {
        return {
            type: "ENC_FUNC",
            algorithm: "xor-base64",
            keyId: hashString(
                options.key || "build"
            ).toString(16),

            payload: String(source)
        };
    }

    function encodeStringLiteral(value, key) {
        return {
            type: "ENC_STR",
            algorithm: "xor-base64",
            data: encodeString(value, key)
        };
    }

    // ------------------------------------------------------------
    // Index transformation helper
    // ------------------------------------------------------------

    class IndexMapper {
        constructor(seed = "kn4ght") {
            this.seed = seed;
            this.map = new Map();
            this.used = new Set();
        }

        get(name) {
            name = String(name);

            if (!this.map.has(name)) {
                this.map.set(
                    name,
                    deriveIndex(
                        name,
                        this.seed,
                        this.used
                    )
                );
            }

            return this.map.get(name);
        }

        entries() {
            return Array.from(this.map.entries());
        }
    }

    // ------------------------------------------------------------
    // Bytecode serializer
    // ------------------------------------------------------------

    function serializeBytecode(bytecode) {
        if (!bytecode || typeof bytecode !== "object") {
            throw new TypeError(
                "Invalid bytecode object"
            );
        }

        return JSON.stringify(bytecode);
    }

    function deserializeBytecode(serialized) {
        const result =
            typeof serialized === "string"
                ? JSON.parse(serialized)
                : serialized;

        if (!result || typeof result !== "object") {
            throw new Error(
                "Invalid serialized bytecode"
            );
        }

        if (!Array.isArray(result.constants)) {
            throw new Error(
                "Bytecode constants must be an array"
            );
        }

        if (!Array.isArray(result.instructions)) {
            throw new Error(
                "Bytecode instructions must be an array"
            );
        }

        return result;
    }

    // ------------------------------------------------------------
    // Development-side bytecode verifier
    // ------------------------------------------------------------

    function verifyBytecode(bytecode) {
        if (!bytecode) {
            throw new Error("Missing bytecode");
        }

        if (bytecode.version !== VERSION) {
            throw new Error(
                "Unsupported bytecode version: " +
                bytecode.version
            );
        }

        if (!Array.isArray(bytecode.constants)) {
            throw new Error(
                "Invalid constants table"
            );
        }

        if (!Array.isArray(bytecode.instructions)) {
            throw new Error(
                "Invalid instruction table"
            );
        }

        for (
            let i = 0;
            i < bytecode.instructions.length;
            i++
        ) {
            const instruction =
                bytecode.instructions[i];

            if (!Array.isArray(instruction) ||
                instruction.length === 0) {
                throw new Error(
                    "Invalid instruction at " + i
                );
            }

            const opcode = instruction[0];

            if (
                typeof opcode !== "number" ||
                !Object.prototype.hasOwnProperty.call(
                    OPCODE_NAMES,
                    opcode
                )
            ) {
                throw new Error(
                    "Invalid opcode at " + i
                );
            }
        }

        return true;
    }

    // ------------------------------------------------------------
    // Compiler context
    // ------------------------------------------------------------

    class VMCompilerContext {
        constructor(options = {}) {
            this.options = {
                seed: options.seed || "kn4ght",
                version: VERSION
            };

            this.builder =
                new BytecodeBuilder(this.options);

            this.functions = [];

            this.indexMapper =
                new IndexMapper(this.options.seed);

            this.sourceMap = [];
        }

        addFunction(info) {
            if (!(info instanceof FunctionInfo)) {
                throw new TypeError(
                    "Expected FunctionInfo"
                );
            }

            this.functions.push(info);

            return info;
        }

        addSourceLocation(generatedLine, sourceLine) {
            this.sourceMap.push({
                generatedLine,
                sourceLine
            });
        }

        build(metadata = {}) {
            const bytecode =
                this.builder.build({
                    ...metadata,

                    functionCount:
                        this.functions.length,

                    sourceMap:
                        this.sourceMap.slice()
                });

            verifyBytecode(bytecode);

            return bytecode;
        }
    }

    // ------------------------------------------------------------
    // Public API
    // ------------------------------------------------------------

    const Kn4ghtVM = {
        VERSION,

        OPCODES,
        OPCODE_NAMES,

        MACROS,
        ALIASES,

        BytecodeBuilder,
        VMFunction,
        FunctionInfo,
        VMCompilerContext,
        IndexMapper,

        normalizeMacro,
        isMacro,
        isCompatibilityNoop,

        parseDirective,

        createCFFPlan,

        encodeString,
        encodeStringLiteral,
        encodeFunctionPlaceholder,

        serializeBytecode,
        deserializeBytecode,
        verifyBytecode,

        hashString
    };

    // ------------------------------------------------------------
    // Browser export
    // ------------------------------------------------------------

    global.Kn4ghtVM = Kn4ghtVM;

})(window);
