// ============================================================
// SYTES OBFUSCATOR
// vm.js - Part 1
// ============================================================

(function (global) {
    "use strict";

    const VERSION = "1.0.0";

    // --------------------------------------------------------
    // Macro aliases
    // --------------------------------------------------------

    const MACRO_ALIASES = Object.freeze({
        LPH_OBFUSCATED: "MV_OBFUSCATED",
        LPH_LINE: "MV_LINE",
        LPH_CRASH: "MV_CRASH",
        LPH_NO_VIRTUALIZE: "MV_OMIT",
        LPH_ENCFUNC: "MV_ENC_FUNC",
        LPH_ENCSTR: "MV_ENC_STR"
    });

    const IGNORED_MACROS = new Set([
        "LPH_ENCNUM",
        "LPH_JIT",
        "LPH_NO_UPVALUES"
    ]);

    const VALID_MACROS = new Set([
        "MV_VM",
        "MV_CFF",
        "MV_ENC_FUNC",
        "MV_ENC_STR",
        "MV_INDEX_TO_NUM",
        "MV_OBFUSCATED",
        "MV_CRASH",
        "MV_OMIT",
        "MV_INLINE",
        "MV_LINE",
        "MV_COMPRESS"
    ]);

    // --------------------------------------------------------
    // Normalize a macro name
    // --------------------------------------------------------

    function normalizeMacro(name) {
        if (!name) {
            return null;
        }

        if (
            Object.prototype.hasOwnProperty.call(
                MACRO_ALIASES,
                name
            )
        ) {
            return MACRO_ALIASES[name];
        }

        if (IGNORED_MACROS.has(name)) {
            return null;
        }

        if (VALID_MACROS.has(name)) {
            return name;
        }

        return name;
    }

    // --------------------------------------------------------
    // Parse comment directives
    //
    // Examples:
    // --!mv:vm
    // --!mv:cff true true 10
    // --!mv:omit
    // --------------------------------------------------------

    function parseDirective(line) {
        if (typeof line !== "string") {
            return null;
        }

        const match =
            line.match(
                /^\s*--!mv:([a-z_]+)(?:\s+(.*?))?\s*$/
            );

        if (!match) {
            return null;
        }

        const name =
            "MV_" +
            match[1].toUpperCase();

        const argumentText =
            match[2] || "";

        const args =
            argumentText
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map(value => {
                    if (value === "true") {
                        return true;
                    }

                    if (value === "false") {
                        return false;
                    }

                    if (
                        /^-?\d+(?:\.\d+)?$/.test(
                            value
                        )
                    ) {
                        return Number(value);
                    }

                    return value;
                });

        return {
            name,
            args,
            raw: line
        };
    }

    // --------------------------------------------------------
    // Function information
    // --------------------------------------------------------

    class FunctionInfo {
        constructor(options = {}) {
            this.name =
                options.name || null;

            this.line =
                options.line || 0;

            this.macros = [];

            this.virtualize = false;

            this.controlFlowFlatten = false;

            this.mangleExpressions = false;

            this.controlFlowPercent = 0;

            this.encrypt = false;

            this.omit = false;

            this.inline = false;
        }

        applyMacro(name, args = []) {
            const macro =
                normalizeMacro(name);

            if (!macro) {
                return this;
            }

            this.macros.push({
                name: macro,
                args
            });

            switch (macro) {
                case "MV_VM":
                    this.virtualize = true;
                    break;

                case "MV_CFF":
                    this.controlFlowFlatten =
                        args[0] === true;

                    this.mangleExpressions =
                        args[1] === true;

                    this.controlFlowPercent =
                        Number(args[2] || 0);

                    break;

                case "MV_ENC_FUNC":
                    this.encrypt = true;
                    break;

                case "MV_OMIT":
                    this.omit = true;
                    break;

                case "MV_INLINE":
                    this.inline = true;
                    break;
            }

            return this;
        }
    }

     // ============================================================
    // VM Compiler Context
    // ============================================================

    class VMCompilerContext {
        constructor(options = {}) {
            this.seed =
                options.seed ||
                createSeed();

            this.functions = [];

            this.metadata = {};

            this.instructions = [];
        }

        addFunction(fn) {
            if (!(fn instanceof FunctionInfo)) {
                throw new TypeError(
                    "Expected FunctionInfo."
                );
            }

            this.functions.push(fn);

            return fn;
        }

        addInstruction(opcode, operands = []) {
            this.instructions.push({
                opcode,
                operands
            });

            return this.instructions.length - 1;
        }

        setMetadata(key, value) {
            this.metadata[key] = value;
        }

        build(metadata = {}) {
            return {
                version: VERSION,

                seed: this.seed,

                functions:
                    this.functions.map(fn => ({
                        name: fn.name,
                        line: fn.line,

                        virtualize:
                            fn.virtualize,

                        controlFlowFlatten:
                            fn.controlFlowFlatten,

                        mangleExpressions:
                            fn.mangleExpressions,

                        controlFlowPercent:
                            fn.controlFlowPercent,

                        encrypt:
                            fn.encrypt,

                        omit:
                            fn.omit,

                        inline:
                            fn.inline,

                        macros:
                            fn.macros
                    })),

                instructions:
                    this.instructions.slice(),

                metadata: {
                    ...this.metadata,
                    ...metadata
                }
            };
        }
    }

    // ============================================================
    // Utility helpers
    // ============================================================

    function createSeed() {
        const chars =
            "abcdefghijklmnopqrstuvwxyz" +
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ" +
            "0123456789";

        let result = "";

        for (let i = 0; i < 32; i++) {
            result += chars[
                Math.floor(
                    Math.random() * chars.length
                )
            ];
        }

        return result;
    }

    function randomIdentifier(length = 8) {
        const first =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

        const rest =
            first + "0123456789";

        let result =
            first[
                Math.floor(
                    Math.random() * first.length
                )
            ];

        for (let i = 1; i < length; i++) {
            result += rest[
                Math.floor(
                    Math.random() * rest.length
                )
            ];
        }

        return result;
    }

    function escapeString(value) {
        return String(value)
            .replace(/\\/g, "\\\\")
            .replace(/"/g, '\\"')
            .replace(/\r/g, "\\r")
            .replace(/\n/g, "\\n")
            .replace(/\t/g, "\\t");
    }

    function encodeString(value) {
        const input = String(value);

        let output = "";

        for (let i = 0; i < input.length; i++) {
            output +=
                input.charCodeAt(i).toString(16)
                    .padStart(2, "0");
        }

        return output;
    }

    // ============================================================
    // Public VM object
    // ============================================================

    const Kn4ghtVM = {
        VERSION,

        MACRO_ALIASES,

        VALID_MACROS,

        normalizeMacro,

        parseDirective,

        FunctionInfo,

        VMCompilerContext,

        createSeed,

        randomIdentifier,

        escapeString,

        encodeString
    };

    global.Kn4ghtVM = Kn4ghtVM;

})(window);

// ============================================================
// SYTES OBFUSCATOR
// vm.js - Part 3
// VM instruction helpers
// ============================================================

(function (global) {
    "use strict";

    const VM = global.Kn4ghtVM;

    if (!VM) {
        throw new Error(
            "Kn4ghtVM Part 1/2 must be loaded first."
        );
    }

    const OPCODES = Object.freeze({
        NOP: 0,
        LOADK: 1,
        MOVE: 2,
        GETGLOBAL: 3,
        SETGLOBAL: 4,
        GETTABLE: 5,
        SETTABLE: 6,
        ADD: 7,
        SUB: 8,
        MUL: 9,
        DIV: 10,
        MOD: 11,
        POW: 12,
        EQ: 13,
        LT: 14,
        LE: 15,
        JMP: 16,
        TEST: 17,
        CALL: 18,
        RETURN: 19,
        CLOSURE: 20
    });

    class Instruction {
        constructor(opcode, operands = []) {
            this.opcode = opcode;
            this.operands = operands.slice();
        }

        toJSON() {
            return {
                opcode: this.opcode,
                operands: this.operands.slice()
            };
        }
    }

    class InstructionBuilder {
        constructor() {
            this.instructions = [];
        }

        emit(opcode, ...operands) {
            const instruction =
                new Instruction(
                    opcode,
                    operands
                );

            this.instructions.push(
                instruction
            );

            return this.instructions.length - 1;
        }

        patch(index, ...operands) {
            if (
                index < 0 ||
                index >= this.instructions.length
            ) {
                throw new RangeError(
                    "Invalid instruction index."
                );
            }

            this.instructions[index].operands =
                operands;

            return this;
        }

        get length() {
            return this.instructions.length;
        }

        build() {
            return this.instructions.map(
                instruction =>
                    instruction.toJSON()
            );
        }
    }

    function createInstructionBuilder() {
        return new InstructionBuilder();
    }

    function opcodeName(value) {
        for (const key of Object.keys(OPCODES)) {
            if (OPCODES[key] === value) {
                return key;
            }
        }

        return "UNKNOWN";
    }

    function encodeInstructions(instructions) {
        return instructions.map(
            instruction => ({
                opcode: instruction.opcode,
                operands:
                    instruction.operands
            })
        );
    }

    VM.OPCODES = OPCODES;
    VM.Instruction = Instruction;
    VM.InstructionBuilder =
        InstructionBuilder;
    VM.createInstructionBuilder =
        createInstructionBuilder;
    VM.opcodeName =
        opcodeName;
    VM.encodeInstructions =
        encodeInstructions;

})(window);

// ============================================================
// SYTES OBFUSCATOR
// vm.js - Part 4
// Macro metadata + source transformation helpers
// ============================================================

(function (global) {
    "use strict";

    const VM = global.Kn4ghtVM;

    if (!VM) {
        throw new Error(
            "Kn4ghtVM is not initialized."
        );
    }

    function parseMacroArguments(text) {
        if (!text) {
            return [];
        }

        const result = [];
        let current = "";
        let quote = null;
        let escaped = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            if (escaped) {
                current += char;
                escaped = false;
                continue;
            }

            if (char === "\\") {
                current += char;
                escaped = true;
                continue;
            }

            if (quote) {
                current += char;

                if (char === quote) {
                    quote = null;
                }

                continue;
            }

            if (
                char === '"' ||
                char === "'"
            ) {
                quote = char;
                current += char;
                continue;
            }

            if (/\s/.test(char)) {
                if (current.trim()) {
                    result.push(
                        convertMacroArgument(
                            current.trim()
                        )
                    );

                    current = "";
                }

                continue;
            }

            current += char;
        }

        if (current.trim()) {
            result.push(
                convertMacroArgument(
                    current.trim()
                )
            );
        }

        return result;
    }

    function convertMacroArgument(value) {
        if (value === "true") {
            return true;
        }

        if (value === "false") {
            return false;
        }

        if (value === "nil") {
            return null;
        }

        if (
            /^-?(?:\d+\.?\d*|\.\d+)$/.test(
                value
            )
        ) {
            return Number(value);
        }

        return value;
    }

    function collectDirectives(source) {
        const directives = [];
        const lines =
            source.split(/\r?\n/);

        for (
            let index = 0;
            index < lines.length;
            index++
        ) {
            const parsed =
                VM.parseDirective(
                    lines[index]
                );

            if (!parsed) {
                continue;
            }

            directives.push({
                name: parsed.name,
                args: parsed.args,
                line: index + 1,
                raw: lines[index]
            });
        }

        return directives;
    }

    function hasDirective(
        directives,
        name,
        line
    ) {
        return directives.some(
            directive =>
                directive.name === name &&
                (
                    line === undefined ||
                    directive.line === line
                )
        );
    }

    function getDirective(
        directives,
        name,
        line
    ) {
        return directives.find(
            directive =>
                directive.name === name &&
                (
                    line === undefined ||
                    directive.line === line
                )
        ) || null;
    }

    function createMacroMetadata(
        directives
    ) {
        return directives.map(
               // ============================================================
    // Macro aliases and compatibility helpers
    // ============================================================

    function isMacro(name) {
        if (!name) {
            return false;
        }

        const normalized =
            VM.normalizeMacro(name);

        return (
            normalized !== null &&
            (
                VM.VALID_MACROS.has(normalized) ||
                VM.MACRO_ALIASES[name] !== undefined
            )
        );
    }

    function isIgnoredMacro(name) {
        return VM.IGNORED_MACROS
            ? VM.IGNORED_MACROS.has(name)
            : (
                name === "LPH_ENCNUM" ||
                name === "LPH_JIT" ||
                name === "LPH_NO_UPVALUES"
            );
    }

    function getMacroName(name) {
        return VM.normalizeMacro(name);
    }

    // ------------------------------------------------------------
    // Simple source metadata
    // ------------------------------------------------------------

    function getLineNumber(source, index) {
        if (
            typeof source !== "string" ||
            typeof index !== "number"
        ) {
            return 1;
        }

        let line = 1;

        for (
            let i = 0;
            i < index &&
            i < source.length;
            i++
        ) {
            if (source[i] === "\n") {
                line++;
            }
        }

        return line;
    }

    function getSourceInfo(source) {
        const text =
            typeof source === "string"
                ? source
                : "";

        return {
            lines:
                text.split(/\r?\n/).length,

            characters:
                text.length,

            bytes:
                new TextEncoder()
                    .encode(text)
                    .length
        };
    }

    // ------------------------------------------------------------
    // Expose helpers
    // ------------------------------------------------------------

    VM.isMacro =
        isMacro;

    VM.isIgnoredMacro =
        isIgnoredMacro;

    VM.getMacroName =
        getMacroName;

    VM.getLineNumber =
        getLineNumber;

    VM.getSourceInfo =
        getSourceInfo;

})(window);
