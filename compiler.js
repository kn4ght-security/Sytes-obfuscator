// ============================================================
// KN4GHT SYTES OBFUSCATOR
// compiler.js - Part 1
// ============================================================

(function (global) {
    "use strict";

    const VM = global.Kn4ghtVM;

    if (!VM) {
        throw new Error(
            "Kn4ghtVM was not loaded. Load vm.js before compiler.js."
        );
    }

    class CompilerError extends Error {
        constructor(message, line = null, column = null) {
            super(
                line !== null
                    ? `${message} (line ${line}${column !== null ? `, column ${column}` : ""})`
                    : message
            );

            this.name = "CompilerError";
            this.line = line;
            this.column = column;
        }
    }

    const TOKEN = Object.freeze({
        IDENTIFIER: "identifier",
        NUMBER: "number",
        STRING: "string",
        SYMBOL: "symbol",
        COMMENT: "comment",
        WHITESPACE: "whitespace",
        EOF: "eof"
    });

    function lineOf(source, index) {
        let line = 1;

        for (let i = 0; i < index; i++) {
            if (source.charCodeAt(i) === 10) {
                line++;
            }
        }

        return line;
    }

    function columnOf(source, index) {
        return index - source.lastIndexOf("\n", index);
    }

    function tokenize(source) {
        const tokens = [];
        let i = 0;

        function push(type, value, start, end) {
            tokens.push({
                type: type,
                value: value,
                start: start,
                end: end,
                line: lineOf(source, start),
                column: columnOf(source, start)
            });
        }

        while (i < source.length) {
            const start = i;
            const ch = source[i];

            if (/\s/.test(ch)) {
                i++;

                while (
                    i < source.length &&
                    /\s/.test(source[i])
                ) {
                    i++;
                }

                push(
                    TOKEN.WHITESPACE,
                    source.slice(start, i),
                    start,
                    i
                );

                continue;
            }

            if (source.startsWith("--", i)) {
                i += 2;

                while (
                    i < source.length &&
                    source[i] !== "\n"
                ) {
                    i++;
                }

                push(
                    TOKEN.COMMENT,
                    source.slice(start, i),
                    start,
                    i
                );

                continue;
            }

            if (
                ch === '"' ||
                ch === "'"
            ) {
                const quote = ch;

                i++;

                while (i < source.length) {
                    if (source[i] === "\\") {
                        i += 2;
                        continue;
                    }

                    if (source[i] === quote) {
                        i++;
                        break;
                    }

                    i++;
                }

                push(
                    TOKEN.STRING,
                    source.slice(start, i),
                    start,
                    i
                );

                continue;
            }

            if (source.startsWith("[[", i)) {
                const close =
                    source.indexOf("]]", i + 2);

                if (close !== -1) {
                    i = close + 2;

                    push(
                        TOKEN.STRING,
                        source.slice(start, i),
                        start,
                        i
                    );

                    continue;
                }
            }

            if (/[0-9]/.test(ch)) {
                i++;

                while (
                    i < source.length &&
                    /[0-9A-Fa-f.xXpPeE_]/.test(
                        source[i]
                    )
                ) {
                    i++;
                }

                push(
                    TOKEN.NUMBER,
                    source.slice(start, i),
                    start,
                    i
                );

                continue;
            }

            if (/[A-Za-z_]/.test(ch)) {
                i++;

                while (
                    i < source.length &&
                    /[A-Za-z0-9_]/.test(
                        source[i]
                    )
                ) {
                    i++;
                }

                push(
                    TOKEN.IDENTIFIER,
                    source.slice(start, i),
                    start,
                    i
                );

                continue;
            }

            const three =
                source.slice(i, i + 3);

            const two =
                source.slice(i, i + 2);

            if (three === "...") {
                i += 3;
            } else if (
                [
                    "==",
                    "~=",
                    "<=",
                    ">=",
                    "..",
                    "//",
                    "<<",
                    ">>",
                    "+=",
                    "-=",
                    "*=",
                    "/=",
                    "%=",
                    "::"
                ].includes(two)
            ) {
                i += 2;
            } else {
                i++;
            }

            push(
                TOKEN.SYMBOL,
                source.slice(start, i),
                start,
                i
            );
        }

        push(
            TOKEN.EOF,
            "",
            source.length,
            source.length
        );

        return tokens;
                }

 // ============================================================
// compiler.js - Part 2
// Macro detection and function analysis
// ============================================================

    const FUNCTION_MACROS = new Set([
        "MV_VM",
        "MV_CFF",
        "MV_ENC_FUNC",
        "MV_OMIT",
        "MV_INLINE"
    ]);

    const ALL_MACROS = new Set([
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
        "MV_COMPRESS",

        "LPH_OBFUSCATED",
        "LPH_LINE",
        "LPH_CRASH",
        "LPH_NO_VIRTUALIZE",
        "LPH_ENCFUNC",
        "LPH_ENCSTR",
        "LPH_ENCNUM",
        "LPH_JIT",
        "LPH_NO_UPVALUES"
    ]);

    function findMacroCalls(source, tokens) {
        const result = [];

        for (let i = 0; i < tokens.length - 1; i++) {
            const token = tokens[i];

            if (
                token.type !== TOKEN.IDENTIFIER ||
                !ALL_MACROS.has(token.value)
            ) {
                continue;
            }

            let j = i + 1;

            while (
                j < tokens.length &&
                tokens[j].type === TOKEN.WHITESPACE
            ) {
                j++;
            }

            const next = tokens[j];

            const normalized =
                VM.normalizeMacro(token.value);

            result.push({
                originalName: token.value,

                normalizedName: normalized,

                type:
                    FUNCTION_MACROS.has(normalized)
                        ? "function"
                        : "value",

                hasCall:
                    !!next &&
                    next.type === TOKEN.SYMBOL &&
                    next.value === "(",

                start: token.start,
                end: token.end,

                line: token.line,
                column: token.column
            });
        }

        return result;
    }

    function findDirectives(source) {
        const lines =
            source.split(/\r?\n/);

        const directives = [];

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {
            const parsed =
                VM.parseDirective(lines[i]);

            if (!parsed) {
                continue;
            }

            directives.push({
                ...parsed,

                line: i + 1,

                source: lines[i]
            });
        }

        return directives;
    }

    function findFunctions(
        source,
        tokens,
        directives
    ) {
        const functions = [];

        const directiveMap =
            new Map();

        for (const directive of directives) {
            directiveMap.set(
                directive.line,
                directive
            );
        }

        for (
            let i = 0;
            i < tokens.length;
            i++
        ) {
            const token = tokens[i];

            if (
                token.type !== TOKEN.IDENTIFIER ||
                token.value !== "function"
            ) {
                continue;
            }

            let j = i + 1;

            while (
                j < tokens.length &&
                tokens[j].type === TOKEN.WHITESPACE
            ) {
                j++;
            }

            let name = null;

            if (
                tokens[j] &&
                tokens[j].type === TOKEN.IDENTIFIER
            ) {
                name = tokens[j].value;
            }

            const info =
                new VM.FunctionInfo({
                    name: name,
                    line: token.line
                });

            const directive =
                directiveMap.get(
                    token.line - 1
                );

            if (directive) {
                info.applyMacro(
                    directive.name,
                    directive.args
                );
            }

            functions.push(info);
        }

        return functions;
    }

    function normalizeAliases(source) {
        return source
            .replace(
                /\bLPH_OBFUSCATED\b/g,
                "MV_OBFUSCATED"
            )
            .replace(
                /\bLPH_LINE\b/g,
                "MV_LINE"
            )
            .replace(
                /\bLPH_CRASH\b/g,
                "MV_CRASH"
            )
            .replace(
                /\bLPH_NO_VIRTUALIZE\b/g,
                "MV_OMIT"
            )
            .replace(
                /\bLPH_ENCFUNC\b/g,
                "MV_ENC_FUNC"
            );
            }

     // ============================================================
    // compiler.js - Part 3
    // Macro transformations
    // ============================================================

    function replaceObfuscatedFlag(source) {
        return source.replace(
            /\bMV_OBFUSCATED\b/g,
            "true"
        );
    }

    function replaceLineMacro(source) {
        const lines =
            source.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
            lines[i] = lines[i].replace(
                /\bMV_LINE\b/g,
                String(i + 1)
            );
        }

        return lines.join("\n");
    }

    function stripCompress(source) {
        return source.replace(
            /\bMV_COMPRESS\s*\(\s*(["'][\s\S]*?["'])\s*\)/g,
            "$1"
        );
    }

    function randomSeed() {
        const chars =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        let output = "";

        for (let i = 0; i < 24; i++) {
            output += chars[
                Math.floor(
                    Math.random() * chars.length
                )
            ];
        }

        return output;
    }

    // ------------------------------------------------------------
    // Compilation result
    // ------------------------------------------------------------

    class CompilationResult {
        constructor() {
            this.ok = false;

            this.source = "";

            this.originalSource = "";

            this.bytecode = null;

            this.functions = [];

            this.macros = [];

            this.directives = [];

            this.warnings = [];

            this.errors = [];

            this.stats = {
                inputBytes: 0,
                outputBytes: 0,
                functionCount: 0,
                macroCount: 0,
                directiveCount: 0
            };
        }
    }

    // ------------------------------------------------------------
    // Main compile function
    // ------------------------------------------------------------

    function compile(source, options = {}) {
        const result =
            new CompilationResult();

        if (typeof source !== "string") {
            result.errors.push(
                "Input must be a string containing Luau source."
            );

            return result;
        }

        result.originalSource = source;

        result.stats.inputBytes =
            new TextEncoder()
                .encode(source)
                .length;

        try {
            const tokens =
                tokenize(source);

            result.directives =
                findDirectives(source);

            result.macros =
                findMacroCalls(
                    source,
                    tokens
                );

            result.functions =
                findFunctions(
                    source,
                    tokens,
                    result.directives
                );

            const context =
                new VM.VMCompilerContext({
                    seed:
                        options.seed ||
                        randomSeed()
                });

            for (
                const fn of result.functions
            ) {
                context.addFunction(fn);
            }

            // ----------------------------------------------------
            // Transform source
            // ----------------------------------------------------

            let output = source;

            output =
                normalizeAliases(output);

            output =
                replaceObfuscatedFlag(output);

            output =
                replaceLineMacro(output);

            output =
                stripCompress(output);

            // ----------------------------------------------------
            // Create VM bytecode metadata
            // ----------------------------------------------------

            result.bytecode =
                context.build({
                    compiler: "sytes",

                    vmVersion:
                        VM.VERSION,

                    macros:
                        result.macros.map(
                            macro => ({
                                name:
                                    macro.normalizedName,

                                line:
                                    macro.line
                            })
                        ),

                    directives:
                        result.directives.map(
                            directive => ({
                                name:
                                    directive.name,

                                args:
                                    directive.args,

                                line:
                                    directive.line
                            })
                        )
                });

            result.source =
                output;

            result.stats.outputBytes =
                new TextEncoder()
                    .encode(output)
                    .length;

            result.stats.functionCount =
                result.functions.length;

            result.stats.macroCount =
                result.macros.length;

            result.stats.directiveCount =
                result.directives.length;

            result.ok = true;

            return result;

        } catch (error) {

            result.errors.push(
                error instanceof Error
                    ? error.message
                    : String(error)
            );

            return result;
        }
                }


     // ============================================================
    // compiler.js - Part 4
    // Public API and export
    // ============================================================

    function obfuscate(source, options = {}) {
        const result =
            compile(source, options);

        if (!result.ok) {
            throw new CompilerError(
                result.errors.join("\n")
            );
        }

        return result.source;
    }

    function analyze(source) {
        if (typeof source !== "string") {
            throw new TypeError(
                "Source must be a string."
            );
        }

        const tokens =
            tokenize(source);

        const directives =
            findDirectives(source);

        const macros =
            findMacroCalls(
                source,
                tokens
            );

        const functions =
            findFunctions(
                source,
                tokens,
                directives
            );

        return {
            tokens,
            macros,
            directives,
            functions
        };
    }

    // ------------------------------------------------------------
    // Export compiler
    // ------------------------------------------------------------

    global.SytesCompiler = {
        VERSION: 2,

        TOKEN,

        CompilerError,

        CompilationResult,

        tokenize,

        findMacroCalls,

        findDirectives,

        findFunctions,

        normalizeAliases,

        compile,

        obfuscate,

        analyze
    };

})(window);
