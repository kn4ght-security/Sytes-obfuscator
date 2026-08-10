// ============================================================
// SYTES OBFUSCATOR
// compiler.js
// Macro-aware Luau source compiler foundation
// ============================================================

(function (global) {
    "use strict";

    const VM = global.Kn4ghtVM;

    if (!VM) {
        throw new Error(
            "vm.js must be loaded before compiler.js"
        );
    }

    // ------------------------------------------------------------
    // Utilities
    // ------------------------------------------------------------

    function isIdentifierStart(char) {
        return /[A-Za-z_]/.test(char);
    }

    function isIdentifierPart(char) {
        return /[A-Za-z0-9_]/.test(char);
    }

    function isLuaKeyword(name) {
        return new Set([
            "and",
            "break",
            "do",
            "else",
            "elseif",
            "end",
            "false",
            "for",
            "function",
            "if",
            "in",
            "local",
            "nil",
            "not",
            "or",
            "repeat",
            "return",
            "then",
            "true",
            "until",
            "while",
            "continue"
        ]).has(name);
    }

    function makeNameGenerator(seed) {
        let state = 0;

        for (let i = 0; i < seed.length; i++) {
            state =
                (
                    state * 31 +
                    seed.charCodeAt(i)
                ) >>> 0;
        }

        return function () {
            state =
                (
                    state * 1664525 +
                    1013904223
                ) >>> 0;

            const chars =
                "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

            let value = "_";

            for (let i = 0; i < 6; i++) {
                state =
                    (
                        state * 1664525 +
                        1013904223
                    ) >>> 0;

                value +=
                    chars[
                        state % chars.length
                    ];
            }

            return value;
        };
    }

    // ------------------------------------------------------------
    // Identifier scanner
    //
    // This deliberately avoids changing strings/comments.
    // ------------------------------------------------------------

    function renameIdentifiers(
        source,
        reserved,
        seed
    ) {
        const nextName =
            makeNameGenerator(seed);

        const replacements =
            new Map();

        const keywords =
            new Set([
                "and",
                "break",
                "do",
                "else",
                "elseif",
                "end",
                "false",
                "for",
                "function",
                "if",
                "in",
                "local",
                "nil",
                "not",
                "or",
                "repeat",
                "return",
                "then",
                "true",
                "until",
                "while",
                "continue"
            ]);

        let output = "";
        let i = 0;

        let quote = null;
        let longComment = false;

        while (i < source.length) {
            const char = source[i];

            // ----------------------------------------------------
            // Strings
            // ----------------------------------------------------

            if (quote) {
                output += char;

                if (char === "\\") {
                    i++;

                    if (i < source.length) {
                        output += source[i];
                    }

                    i++;
                    continue;
                }

                if (char === quote) {
                    quote = null;
                }

                i++;
                continue;
            }

            if (
                char === '"' ||
                char === "'"
            ) {
                quote = char;
                output += char;
                i++;
                continue;
            }

            // ----------------------------------------------------
            // Comments
            // ----------------------------------------------------

            if (
                char === "-" &&
                source[i + 1] === "-"
            ) {
                const start = i;

                while (
                    i < source.length &&
                    source[i] !== "\n"
                ) {
                    i++;
                }

                output +=
                    source.slice(start, i);

                continue;
            }

            // ----------------------------------------------------
            // Identifier
            // ----------------------------------------------------

            if (isIdentifierStart(char)) {
                const start = i;

                i++;

                while (
                    i < source.length &&
                    isIdentifierPart(source[i])
                ) {
                    i++;
                }

                const name =
                    source.slice(start, i);

                if (
                    keywords.has(name) ||
                    reserved.has(name) ||
                    name.startsWith("MV_") ||
                    name.startsWith("LPH_")
                ) {
                    output += name;
                    continue;
                }

                if (!replacements.has(name)) {
                    let generated;

                    do {
                        generated =
                            nextName();
                    } while (
                        reserved.has(generated) ||
                        keywords.has(generated)
                    );

                    replacements.set(
                        name,
                        generated
                    );
                }

                output +=
                    replacements.get(name);

                continue;
            }

            output += char;
            i++;
        }

        return {
            code: output,
            replacements
        };
    }

    // ------------------------------------------------------------
    // Macro preprocessing
    // ------------------------------------------------------------

    function processDirectives(source) {
        const lines =
            source.split(/\r?\n/);

        const directives = [];
        const output = [];

        for (
            let i = 0;
            i < lines.length;
            i++
        ) {
            const line = lines[i];

            const directive =
                VM.parseDirective(line);

            if (directive) {
                directives.push({
                    name: directive.name,
                    args: directive.args,
                    line: i + 1
                });

                // Remove compiler directives from
                // generated source.
                continue;
            }

            output.push(line);
        }

        return {
            code: output.join("\n"),
            directives
        };
    }

    // ------------------------------------------------------------
    // Function-level macro metadata
    // ------------------------------------------------------------

    function buildFunctionMetadata(
        directives
    ) {
        const functions = [];

        for (const directive of directives) {
            const info =
                new VM.FunctionInfo({
                    line: directive.line
                });

            info.applyMacro(
                directive.name,
                directive.args
            );

            functions.push(info);
        }

        return functions;
    }

    // ------------------------------------------------------------
    // MV_OBFUSCATED
    // ------------------------------------------------------------

    function replaceObfuscatedMacro(source) {
        return source.replace(
            /\bMV_OBFUSCATED\b/g,
            "true"
        );
    }

    // ------------------------------------------------------------
    // MV_LINE
    //
    // We resolve occurrences based on their
    // source position.
    // ------------------------------------------------------------

    function replaceLineMacro(source) {
        return source.replace(
            /\bMV_LINE\b/g,
            function (_, offset) {
                return String(
                    VM.getLineNumber(
                        source,
                        offset
                    )
                );
            }
        );
    }

    // ------------------------------------------------------------
    // MV_COMPRESS
    //
    // Current documented behavior is passthrough.
    // ------------------------------------------------------------

    function replaceCompress(source) {
        return source.replace(
            /\bMV_COMPRESS\s*\(/g,
            ""
        );
    }

    // The passthrough above intentionally only handles
    // simple use cases. We don't attempt to reconstruct
    // arbitrary nested Lua expressions here.

    // ------------------------------------------------------------
    // MV_CRASH
    //
    // Do not inject arbitrary runtime faults automatically.
    // Leave the call intact for a later backend.
    // ------------------------------------------------------------

    function preserveRuntimeMacros(source) {
        return source;
    }

    // ------------------------------------------------------------
    // Remove known ignored LPH macros
    // ------------------------------------------------------------

    function removeIgnoredMacros(source) {
        let result = source;

        result =
            result.replace(
                /\bLPH_ENCNUM\s*\(/g,
                "("
            );

        result =
            result.replace(
                /\bLPH_JIT\s*\(/g,
                "("
            );

        result =
            result.replace(
                /\bLPH_NO_UPVALUES\s*\(/g,
                "("
            );

        return result;
    }

    // ------------------------------------------------------------
    // Compile
    // ------------------------------------------------------------

    function compile(source, options = {}) {
        if (typeof source !== "string") {
            throw new TypeError(
                "source must be a string"
            );
        }

        const seed =
            options.seed ||
            VM.createSeed();

        const context =
            VM.createCompilerContext({
                seed
            });

        const preprocessed =
            processDirectives(source);

        let code =
            preprocessed.code;

        const directives =
            preprocessed.directives;

        // --------------------------------------------------------
        // Macro metadata
        // --------------------------------------------------------

        const functionMetadata =
            buildFunctionMetadata(
                directives
            );

        for (const fn of functionMetadata) {
            context.addFunction(fn);
        }

        // --------------------------------------------------------
        // Basic compile-time macros
        // --------------------------------------------------------

        code =
            replaceObfuscatedMacro(
                code
            );

        code =
            replaceLineMacro(
                code
            );

        code =
            removeIgnoredMacros(
                code
            );

        code =
            replaceCompress(
                code
            );

        code =
            preserveRuntimeMacros(
                code
            );

        // --------------------------------------------------------
        // Identifier mangling
        // --------------------------------------------------------

        let renameResult = {
            code,
            replacements: new Map()
        };

        if (
            options.mangleIdentifiers !== false
        ) {
            const reserved =
                new Set([
                    "game",
                    "workspace",
                    "script",
                    "shared",
                    "_G",
                    "Enum",
                    "Instance",
                    "Vector2",
                    "Vector3",
                    "CFrame",
                    "Color3",
                    "UDim2",
                    "Players",
                    "RunService",
                    "ReplicatedStorage",
                    "UserInputService",
                    "task",
                    "math",
                    "string",
                    "table",
                    "coroutine",
                    "debug",
                    "os",
                    "require",
                    "print",
                    "warn",
                    "error",
                    "pairs",
                    "ipairs",
                    "next",
                    "select",
                    "typeof",
                    "tostring",
                    "tonumber",
                    "pcall",
                    "xpcall",
                    "getmetatable",
                    "setmetatable",
                    "rawget",
                    "rawset"
                ]);

            renameResult =
                renameIdentifiers(
                    code,
                    reserved,
                    seed
                );

            code =
                renameResult.code;
        }

        // --------------------------------------------------------
        // Metadata
        // --------------------------------------------------------

        context.setMetadata(
            "sourceInfo",
            VM.getSourceInfo(source)
        );

        context.setMetadata(
            "directives",
            directives
        );

        context.setMetadata(
            "identifierCount",
            renameResult.replacements.size
        );

        context.setMetadata(
            "virtualizedFunctions",
            functionMetadata.filter(
                fn => fn.virtualize
            ).length
        );

        context.setMetadata(
            "cffFunctions",
            functionMetadata.filter(
                fn =>
                    fn.controlFlowFlatten
            ).length
        );

        const build =
            context.build();

        return {
            code,

            metadata: build,

            seed,

            directives,

            replacements:
                Object.fromEntries(
                    renameResult.replacements
                )
        };
    }

    // ------------------------------------------------------------
    // Convenience API
    // ------------------------------------------------------------

    function obfuscate(
        source,
        options = {}
    ) {
        return compile(
            source,
            options
        ).code;
    }

    // ------------------------------------------------------------
    // Public compiler
    // ------------------------------------------------------------

    const Kn4ghtCompiler = {
        VERSION: VM.VERSION,

        compile,

        obfuscate,

        processDirectives,

        buildFunctionMetadata,

        renameIdentifiers
    };

    global.Kn4ghtCompiler =
        Kn4ghtCompiler;

    // ------------------------------------------------------------
    // CommonJS compatibility
    // ------------------------------------------------------------

    if (
        typeof module !== "undefined" &&
        module.exports
    ) {
        module.exports =
            Kn4ghtCompiler;
    }

})(window);
