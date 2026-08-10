"use strict";

// ===============================
// LuaVeil - Part 1
// ===============================

const source = document.getElementById("source");
const output = document.getElementById("output");
const status = document.getElementById("status");

const inputCounter =
    document.getElementById("inputCounter");

const outputCounter =
    document.getElementById("outputCounter");

const fileInput =
    document.getElementById("fileInput");

const clearBtn =
    document.getElementById("clearBtn");

const copyBtn =
    document.getElementById("copyBtn");

const downloadBtn =
    document.getElementById("downloadBtn");

const obfuscateBtn =
    document.getElementById("obfuscateBtn");

const removeComments =
    document.getElementById("removeComments");

const renameLocals =
    document.getElementById("renameLocals");

const encodeStrings =
    document.getElementById("encodeStrings");

const minify =
    document.getElementById("minify");


// ===============================
// STATUS
// ===============================

function setStatus(message, type) {
    status.textContent = message;
    status.className = "status";

    if (type) {
        status.classList.add(type);
    }
}


// ===============================
// COUNTERS
// ===============================

function updateCounters() {
    inputCounter.textContent =
        source.value.length + " characters";

    outputCounter.textContent =
        output.value.length + " characters";
}


// ===============================
// LUA KEYWORDS
// ===============================

const luaKeywords = new Set([
    "and",
    "break",
    "do",
    "else",
    "elseif",
    "end",
    "false",
    "for",
    "function",
    "goto",
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
    "while"
]);


// ===============================
// PROTECTED NAMES
// ===============================

const protectedNames = new Set([
    "print",
    "warn",
    "error",
    "assert",
    "pairs",
    "ipairs",
    "next",
    "pcall",
    "xpcall",
    "select",
    "tonumber",
    "tostring",
    "type",

    "math",
    "string",
    "table",
    "coroutine",
    "debug",
    "os",
    "utf8",

    "game",
    "workspace",
    "script",
    "shared",

    "Players",
    "RunService",
    "UserInputService",
    "ReplicatedStorage",
    "LocalPlayer"
]);


// ===============================
// TOKENIZER
// ===============================

function tokenize(code) {

    const tokens = [];

    let i = 0;

    while (i < code.length) {

        const char = code[i];


        // Whitespace
        if (/\s/.test(char)) {

            const start = i;

            while (
                i < code.length &&
                /\s/.test(code[i])
            ) {
                i++;
            }

            tokens.push({
                type: "space",
                value: code.slice(start, i)
            });

            continue;
        }


        // Long comment
        if (code.startsWith("--[[", i)) {

            const start = i;

            const end =
                code.indexOf("]]", i + 4);

            if (end !== -1) {

                i = end + 2;

                tokens.push({
                    type: "comment",
                    value: code.slice(start, i)
                });

                continue;
            }
        }


        // Long string
        if (code.startsWith("[[", i)) {

            const start = i;

            const end =
                code.indexOf("]]", i + 2);

            if (end !== -1) {

                i = end + 2;

                tokens.push({
                    type: "string",
                    value: code.slice(start, i)
                });

                continue;
            }
        }


        // Normal strings
        if (
            char === "'" ||
            char === '"'
        ) {

            const quote = char;
            const start = i;

            i++;

            while (i < code.length) {

                if (code[i] === "\\") {
                    i += 2;
                    continue;
                }

                if (code[i] === quote) {
                    i++;
                    break;
                }

                i++;
            }

            tokens.push({
                type: "string",
                value: code.slice(start, i)
            });

            continue;
        }


        // Single-line comment
        if (
            char === "-" &&
            code[i + 1] === "-"
        ) {

            const start = i;

            while (
                i < code.length &&
                code[i] !== "\n"
            ) {
                i++;
            }

            tokens.push({
                type: "comment",
                value: code.slice(start, i)
            });

            continue;
        }


        // Identifier
        if (
            /[A-Za-z_]/.test(char)
        ) {

            const start = i;

            i++;

            while (
                i < code.length &&
                /[A-Za-z0-9_]/.test(code[i])
            ) {
                i++;
            }

            tokens.push({
                type: "identifier",
                value: code.slice(start, i)
            });

            continue;
        }


        // Number
        if (
            /[0-9]/.test(char)
        ) {

            const start = i;

            i++;

            while (
                i < code.length &&
                /[A-Za-z0-9_.]/.test(code[i])
            ) {
                i++;
            }

            tokens.push({
                type: "number",
                value: code.slice(start, i)
            });

            continue;
        }


        // Symbol
        tokens.push({
            type: "symbol",
            value: char
        });

        i++;
    }

    return tokens;
}


// ===============================
// RANDOM VARIABLE NAME
// ===============================

function generateName(index) {

    const letters =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let value =
        ((index + 1) * 2654435761) >>> 0;

    let result = "_v";

    for (let i = 0; i < 6; i++) {

        value =
            (value * 1664525 + 1013904223) >>> 0;

        result +=
            letters[
                value % letters.length
            ];
    }

    return result;
            }


// ===============================
// FIND LOCAL VARIABLES
// ===============================

function findLocalNames(tokens) {

    const names = [];

    for (
        let i = 0;
        i < tokens.length;
        i++
    ) {

        if (
            tokens[i].type !== "identifier" ||
            tokens[i].value !== "local"
        ) {
            continue;
        }

        let j = i + 1;

        while (
            tokens[j] &&
            tokens[j].type === "space"
        ) {
            j++;
        }

        if (
            tokens[j] &&
            tokens[j].type === "identifier" &&
            tokens[j].value === "function"
        ) {

            j++;

            while (
                tokens[j] &&
                tokens[j].type === "space"
            ) {
                j++;
            }

            if (
                tokens[j] &&
                tokens[j].type === "identifier"
            ) {

                const name =
                    tokens[j].value;

                if (
                    !luaKeywords.has(name) &&
                    !protectedNames.has(name) &&
                    !names.includes(name)
                ) {
                    names.push(name);
                }
            }

            continue;
        }

        while (j < tokens.length) {

            while (
                tokens[j] &&
                tokens[j].type === "space"
            ) {
                j++;
            }

            if (
                !tokens[j] ||
                tokens[j].type !== "identifier"
            ) {
                break;
            }

            const name =
                tokens[j].value;

            if (
                !luaKeywords.has(name) &&
                !protectedNames.has(name) &&
                !names.includes(name)
            ) {
                names.push(name);
            }

            j++;

            while (
                tokens[j] &&
                tokens[j].type === "space"
            ) {
                j++;
            }

            if (
                tokens[j] &&
                tokens[j].type === "symbol" &&
                tokens[j].value === ","
            ) {

                j++;

                continue;
            }

            break;
        }
    }

    return names;
}


// ===============================
// RENAME LOCALS
// ===============================

function renameLocalVariables(tokens) {

    const names =
        findLocalNames(tokens);

    const replacements =
        new Map();

    names.forEach(
        function (name, index) {

            replacements.set(
                name,
                generateName(index)
            );
        }
    );

    return tokens.map(
        function (token) {

            if (
                token.type === "identifier" &&
                replacements.has(token.value)
            ) {

                return {
                    type: "identifier",
                    value:
                        replacements.get(
                            token.value
                        )
                };
            }

            return token;
        }
    );
}


// ===============================
// STRING ENCODER
// ===============================

function encodeLuaString(value) {

    if (
        value.startsWith("[[")
    ) {
        return value;
    }

    if (value.length < 2) {
        return value;
    }

    const quote = value[0];

    if (
        quote !== "'" &&
        quote !== '"'
    ) {
        return value;
    }

    const content =
        value.slice(
            1,
            value.length - 1
        );

    let result = "";

    for (
        let i = 0;
        i < content.length;
        i++
    ) {

        const character =
            content[i];

        if (
            character === "\\"
        ) {

            if (
                i + 1 < content.length
            ) {

                result +=
                    "\\" +
                    content[i + 1];

                i++;

                continue;
            }
        }

        const code =
            content.charCodeAt(i);

        if (
            code >= 32 &&
            code <= 126 &&
            character !== '"'
        ) {

            result += character;

        } else {

            result +=
                "\\" + code;
        }
    }

    return '"' + result + '"';
}


// ===============================
// MINIFY
// ===============================

function minifyTokens(tokens) {

    const result = [];

    for (
        let i = 0;
        i < tokens.length;
        i++
    ) {

        const token =
            tokens[i];

        if (
            token.type !== "space"
        ) {

            result.push(token);

            continue;
        }

        const previous =
            result[result.length - 1];

        const next =
            tokens[i + 1];

        if (
            !previous ||
            !next
        ) {
            continue;
        }

        const previousNeedsSpace =
            previous.type === "identifier" ||
            previous.type === "number";

        const nextNeedsSpace =
            next.type === "identifier" ||
            next.type === "number";

        if (
            previousNeedsSpace &&
            nextNeedsSpace
        ) {

            result.push({
                type: "space",
                value: " "
            });
        }
    }

    return result;
}


// ===============================
// MAIN OBFUSCATOR
// ===============================

function obfuscate(code) {

    if (!code.trim()) {

        throw new Error(
            "Paste Lua/Luau code first."
        );
    }

    if (code.length > 1000000) {

        throw new Error(
            "Maximum source size is 1 MB."
        );
    }

    let tokens =
        tokenize(code);

    if (
        removeComments.checked
    ) {

        tokens =
            tokens.filter(
                function (token) {
                    return (
                        token.type !==
                        "comment"
                    );
                }
            );
    }

    if (
        renameLocals.checked
    ) {

        tokens =
            renameLocalVariables(
                tokens
            );
    }

    if (
        encodeStrings.checked
    ) {

        tokens =
            tokens.map(
                function (token) {

                    if (
                        token.type ===
                        "string"
                    ) {

                        return {
                            type: "string",

                            value:
                                encodeLuaString(
                                    token.value
                                )
                        };
                    }

                    return token;
                }
            );
    }

    if (
        minify.checked
    ) {

        tokens =
            minifyTokens(tokens);
    }

    return tokens
        .map(
            function (token) {
                return token.value;
            }
        )
        .join("");
}


// ===============================
// BUTTONS
// ===============================

obfuscateBtn.addEventListener(
    "click",
    function () {

        obfuscateBtn.disabled = true;

        obfuscateBtn.textContent =
            "Processing...";

        setStatus(
            "Obfuscating...",
            "loading"
        );

        setTimeout(
            function () {

                try {

                    output.value =
                        obfuscate(
                            source.value
                        );

                    updateCounters();

                    setStatus(
                        "Obfuscation complete.",
                        "success"
                    );

                } catch (error) {

                    output.value = "";

                    updateCounters();

                    setStatus(
                        error.message,
                        "error"
                    );
                }

                obfuscateBtn.disabled =
                    false;

                obfuscateBtn.textContent =
                    "Obfuscate Lua";

            },
            30
        );
    }
);


// ===============================
// FILE UPLOAD
// ===============================

fileInput.addEventListener(
    "change",
    function (event) {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }

        if (
            !/\.(lua|luau|txt)$/i.test(
                file.name
            )
        ) {

            setStatus(
                "Only Lua, Luau, or TXT files are supported.",
                "error"
            );

            fileInput.value = "";

            return;
        }

        if (
            file.size > 1000000
        ) {

            setStatus(
                "File is larger than 1 MB.",
                "error"
            );

            fileInput.value = "";

            return;
        }

        const reader =
            new FileReader();

        reader.onload =
            function () {

                source.value =
                    String(
                        reader.result || ""
                    );

                updateCounters();

                setStatus(
                    file.name + " loaded.",
                    "success"
                );
            };

        reader.onerror =
            function () {

                setStatus(
                    "Could not read the file.",
                    "error"
                );
            };

        reader.readAsText(file);
    }
);


// ===============================
// CLEAR
// ===============================

clearBtn.addEventListener(
    "click",
    function () {

        source.value = "";

        output.value = "";

        fileInput.value = "";

        updateCounters();

        setStatus("");
    }
);


// ===============================
// COPY
// ===============================

copyBtn.addEventListener(
    "click",
    async function () {

        if (!output.value) {

            setStatus(
                "Nothing to copy.",
                "error"
            );

            return;
        }

        try {

            await navigator.clipboard.writeText(
                output.value
            );

        } catch {

            output.focus();

            output.select();

            document.execCommand(
                "copy"
            );
        }

        setStatus(
            "Copied to clipboard.",
            "success"
        );
    }
);


// ===============================
// DOWNLOAD
// ===============================

downloadBtn.addEventListener(
    "click",
    function () {

        if (!output.value) {

            setStatus(
                "Nothing to download.",
                "error"
            );

            return;
        }

        const blob =
            new Blob(
                [output.value],
                {
                    type:
                        "text/plain;charset=utf-8"
                }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "luaveil-protected.lua";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(url);

        setStatus(
            "Downloaded luaveil-protected.lua.",
            "success"
        );
    }
);


// ===============================
// START
// ===============================

source.addEventListener(
    "input",
    updateCounters
);

updateCounters();

setStatus("");
