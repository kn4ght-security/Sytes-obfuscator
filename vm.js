// ============================================================
// SYTES OBFUSCATOR
// vm.js
// Macro/VM compiler foundation
// ============================================================

(function (global) {
    "use strict";

    const VERSION = "1.0.0";

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

    function normalizeMacro(name) {
        if (!name) return null;

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

        return VALID_MACROS.has(name)
            ? name
            : name;
    }

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

        const name =
            "MV_" +
            match[1].toUpperCase();

        const text =
            match[2] || "";

        const args =
            text
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
                });

        return {
            name,
            args,
            raw: line
        };
    }

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
                args: args.slice()
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

    class VMCompilerContext {
        constructor(options = {}) {
            this.seed =
                options.seed ||
                createSeed();

            this.functions = [];
            this.instructions = [];
            this.metadata = {};
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

        addInstruction(
            opcode,
            operands = []
        ) {
            this.instructions.push({
                opcode,
                operands: operands.slice()
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
                            fn.macros.map(
                                macro => ({
                                    name:
                                        macro.name,

                                    args:
                                        macro.args.slice()
                                })
                            )
                    })),

                instructions:
                    this.instructions.map(
                        instruction => ({
                            opcode:
                                instruction.opcode,

                            operands:
                                instruction.operands.slice()
                        })
                    ),

                metadata: {
                    ...this.metadata,
                    ...metadata
                }
            };
        }
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

    function parseMacroArguments(text) {
        if (!text) return [];

        return text
            .trim()
            .split(/\s+/)
            .filter(Boolean)
            .map(value => {
                if (value === "true") return true;
                if (value === "false") return false;
                if (value === "nil") return null;

                if (
                    /^-?(?:\d+\.?\d*|\.\d+)$/.test(
                        value
                    )
                ) {
                    return Number(value);
                }

                return value;
            });
    }

    function collectDirectives(source) {
        if (typeof source !== "string") {
            return [];
        }

        const lines =
            source.split(/\r?\n/);

        const result = [];

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {
            const directive =
                parseDirective(lines[i]);

            if (!directive) continue;

            result.push({
                name: directive.name,
                args: directive.args,
                line: i + 1,
                raw: lines[i]
            });
        }

        return result;
    }

    function getLineNumber(
        source,
        index
    ) {
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

    function createCompilerContext(
        options = {}
    ) {
        const context =
            new VMCompilerContext(options);

        context.setMetadata(
            "compiler",
            "Sytes"
        );

        context.setMetadata(
            "version",
            VERSION
        );

        return context;
    }

    global.Kn4ghtVM = {
        VERSION,

        MACRO_ALIASES,
        IGNORED_MACROS,
        VALID_MACROS,
        OPCODES,

        normalizeMacro,
        parseDirective,
        parseMacroArguments,
        collectDirectives,

        FunctionInfo,
        VMCompilerContext,

        createCompilerContext,
        createSeed,
        randomIdentifier,
        getLineNumber,
        getSourceInfo
    };

})(window);
