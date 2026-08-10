"use strict";

const source = document.getElementById("source");
const output = document.getElementById("output");

const sourceInfo = document.getElementById("sourceInfo");
const outputInfo = document.getElementById("outputInfo");

const status = document.getElementById("status");

const fileInput = document.getElementById("fileInput");

const clearButton = document.getElementById("clearButton");
const copyButton = document.getElementById("copyButton");
const downloadButton = document.getElementById("downloadButton");
const obfuscateButton = document.getElementById("obfuscateButton");

const removeComments =
    document.getElementById("removeComments");

const renameLocals =
    document.getElementById("renameLocals");

const encodeStrings =
    document.getElementById("encodeStrings");

const minify =
    document.getElementById("minify");


// =====================================================
// UI HELPERS
// =====================================================

function updateInfo() {
    sourceInfo.textContent =
        `${source.value.length.toLocaleString()} characters`;

    outputInfo.textContent =
        `${output.value.length.toLocaleString()} characters`;
}


function setStatus(message, type = "") {
    status.textContent = message;
    status.className = "status";

    if (type) {
        status.classList.add(type);
    }
}


// =====================================================
// LEXER
//
// This protects strings/comments while transformations
// are being performed. It is deliberately conservative.
// =====================================================

function tokenizeLua(code) {
    const tokens = [];

    let i = 0;

    while (i < code.length) {

        const char = code[i];

        // ---------------------------------------------
        // Whitespace
        // ---------------------------------------------

        if (/\s/.test(char)) {

            let start = i;

            while (
                i < code.length &&
                /\s/.test(code[i])
            ) {
                i++;
            }

            tokens.push({
                type: "whitespace",
                value: code.slice(start, i)
            });

            continue;
        }


        // ---------------------------------------------
        // Long comments / strings
        // ---------------------------------------------

        if (
            code.startsWith("[[", i) ||
            code.startsWith("--[[", i)
        ) {

            const isComment =
                code.startsWith("--[[", i);

            const start = i;

            const searchStart =
                isComment ? i + 4 : i + 2;

            const end =
                code.indexOf("]]", searchStart);

            if (end !== -1) {

                i = end + 2;

                tokens.push({
                    type: isComment
                        ? "comment"
                        : "string",

                    value:
                        code.slice(start, i)
                });

                continue;
            }
        }


        // ---------------------------------------------
        // Short strings
        // ---------------------------------------------

        if (char === "'" || char === '"') {

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


        // ---------------------------------------------
        // Single-line comments
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Identifier
        // ---------------------------------------------

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


        // ---------------------------------------------
        // Everything else
        // ---------------------------------------------

        tokens.push({
            type: "symbol",
            value: char
        });

        i++;
    }

    return tokens;
}


// =====================================================
// LUA KEYWORDS / GLOBALS
// =====================================================

const keywords = new Set([
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


const protectedNames = new Set([
    "assert",
    "error",
    "ipairs",
    "pairs",
    "next",
    "pcall",
    "print",
    "select",
    "tonumber",
    "tostring",
    "type",
    "warn",
    "xpcall",

    "coroutine",
    "debug",
    "io",
    "math",
    "os",
    "package",
    "string",
    "table",
    "utf8",

    "game",
    "workspace",
    "script",
    "shared"
]);


// =====================================================
// RANDOM IDENTIFIER
// =====================================================

function generatedName(index) {

    const chars =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let seed =
        (index + 1) * 2654435761 >>> 0;

    let name = "_v";

    for (let i = 0; i < 6; i++) {

        seed =
            (seed * 1664525 + 1013904223) >>> 0;

        name +=
            chars[seed % chars.length];
    }

    return name;
}


// =====================================================
// STRING ENCODING
//
// Converts:
// "hello"
// into:
// "\104\101\108\108\111"
//
// This preserves the actual string value in Lua.
// =====================================================

function encodeString(token) {

    const quote = token.value[0];

    if (
        quote !== "'" &&
        quote !== '"'
    ) {
        return token.value;
    }


    const inner =
        token.value.slice(
            1,
            -1
        );


    let result = "";


    for (let i = 0; i < inner.length; i++) {

        const char = inner[i];


        // Preserve existing escapes.
        if (char === "\\") {

            if (i + 1 < inner.length) {
                result +=
                    "\\" + inner[i + 1];

                i++;

                continue;
            }
        }


        const code =
            inner.charCodeAt(i);


        // Keep normal printable characters readable
        // only when safe.
        if (
            code >= 32 &&
            code <= 126 &&
            char !== '"'
        ) {
            result += char;
        } else {
            result +=
                "\\" + code;
        }
    }


    return `"${result}"`;
}


// =====================================================
// REMOVE COMMENTS
// =====================================================

function removeCommentsFromTokens(tokens) {

    return tokens.filter(
        token =>
            token.type !== "comment"
    );
}


// =====================================================
// COLLECT SIMPLE LOCAL VARIABLES
//
// Handles examples such as:
//
// local foo
// local foo = 123
// local foo, bar = 1, 2
//
// It intentionally does NOT rename arbitrary globals.
// =====================================================

function collectLocalNames(tokens) {

    const names = new Set();

    for (let i = 0; i < tokens.length; i++) {

        const token = tokens[i];

        if (
            token.type !== "identifier" ||
            token.value !== "local"
        ) {
            continue;
        }


        let j = i + 1;


        // local function name
        if (
            tokens[j] &&
            tokens[j].type === "identifier" &&
            tokens[j].value === "function"
        ) {

            j++;

            if (
                tokens[j] &&
                tokens[j].type === "identifier"
            ) {
                const name =
                    tokens[j].value;

                if (
                    !keywords.has(name) &&
                    !protectedNames.has(name)
                ) {
                    names.add(name);
                }
            }

            continue;
        }


        // local a, b, c = ...
        while (j < tokens.length) {

            const current =
                tokens[j];


            if (
                current.type === "identifier" &&
                !keywords.has(current.value) &&
                !protectedNames.has(current.value)
            ) {

                names.add(current.value);

                j++;

                continue;
            }


            if (
                current.type === "symbol" &&
                current.value === ","
            ) {
                j++;
                continue;
            }


            break;
        }
    }

    return [...names];
}


// =====================================================
// RENAME LOCAL REFERENCES
// =====================================================

function renameLocalsInTokens(tokens) {

    const localNames =
        collectLocalNames(tokens);

    const mapping = new Map();


    localNames.forEach(
        (name, index) => {

            mapping.set(
                name,
                generatedName(index)
            );
        }
    );


    if (mapping.size === 0) {
        return tokens;
    }


    return tokens.map(token => {

        if (
            token.type === "identifier" &&
            mapping.has(token.value)
        ) {

            return {
                ...token,
                value:
                    mapping.get(token.value)
            };
        }

        return token;
    });
}


// =====================================================
// MINIFICATION
//
// We don't remove every space because Lua syntax can
// depend on token boundaries.
// =====================================================

function minifyTokens(tokens) {

    const output = [];

    for (let i = 0; i < tokens.length; i++) {

        const current =
            tokens[i];


        if (
            current.type === "whitespace"
        ) {

            const previous =
                output[output.length - 1];

            const next =
                tokens[i + 1];


            if (
                previous &&
                next &&
                (
                    (
                        (
                            previous.type === "identifier" ||
                            previous.type === "number"
                        ) &&
                        (
                            next.type === "identifier" ||
                            next.type === "number"
                        )
                    )
                )
            ) {

                output.push({
                    type: "whitespace",
                    value: " "
                });
            }

            continue;
        }


        output.push(current);
    }


    return output;
}


// =====================================================
// RENDER TOKENS
// =====================================================

function renderTokens(tokens) {

    return tokens
        .map(token => token.value)
        .join("");
}


// =====================================================
// MAIN OBFUSCATOR
// =====================================================

function obfuscateLua(code) {

    if (!code.trim()) {
        throw new Error(
            "Paste Lua/Luau code first."
        );
    }


    if (code.length > 1000000) {
        throw new Error(
            "Source code is limited to 1 MB."
        );
    }


    let tokens =
        tokenizeLua(code);


    if (removeComments.checked) {

        tokens =
            removeCommentsFromTokens(tokens);
    }


    if (renameLocals.checked) {

        tokens =
            renameLocalsInTokens(tokens);
    }


    if (encodeStrings.checked) {

        tokens =
            tokens.map(token => {

                if (
                    token.type === "string"
                ) {
                    return {
                        ...token,
                        value:
                            encodeString(token)
                    };
                }

                return token;
            });
    }


    if (minify.checked) {

        tokens =
            minifyTokens(tokens);
    }


    return renderTokens(tokens);
}


// =====================================================
// OBFUSCATE BUTTON
// =====================================================

obfuscateButton.addEventListener(
    "click",
    async () => {

        try {

            obfuscateButton.disabled = true;

            obfuscateButton.textContent =
                "Processing...";

            setStatus(
                "Processing source...",
                "loading"
            );


            // Gives the browser a chance to repaint.
            await new Promise(
                resolve =>
                    setTimeout(resolve, 50)
            );


            const result =
                obfuscateLua(
                    source.value
                );


            output.value =
                result;


            updateInfo();


            setStatus(
                "Obfuscation completed.",
                "success"
            );

        } catch (error) {

            output.value = "";

            updateInfo();


            setStatus(
                error.message ||
                "Unable to process the source.",
                "error"
            );

        } finally {

            obfuscateButton.disabled = false;

            obfuscateButton.textContent =
                "Obfuscate Code";
        }
    }
);


// =====================================================
// FILE UPLOAD
// =====================================================

fileInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) {
            return;
        }


        const allowed =
            /\.(lua|luau|txt)$/i.test(
                file.name
            );


        if (!allowed) {

            setStatus(
                "Only .lua, .luau, and .txt files are supported.",
                "error"
            );

            fileInput.value = "";

            return;
        }


        if (file.size > 1000000) {

            setStatus(
                "The file is larger than 1 MB.",
                "error"
            );

            fileInput.value = "";

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            source.value =
                String(reader.result || "");

            updateInfo();


            setStatus(
                `${file.name} loaded.`,
                "success"
            );
        };


        reader.onerror = () => {

            setStatus(
                "Failed to read the file.",
                "error"
            );
        };


        reader.readAsText(file);
    }
);


// =====================================================
// CLEAR
// =====================================================

clearButton.addEventListener(
    "click",
    () => {

        source.value = "";
        output.value = "";

        fileInput.value = "";

        updateInfo();

        setStatus("");
    }
);


// =====================================================
// COPY
// =====================================================

copyButton.addEventListener(
    "click",
    async () => {

        if (!output.value) {

            setStatus(
                "There is no output to copy.",
                "error"
            );

            return;
        }


        try {

            await navigator.clipboard.writeText(
                output.value
            );

            setStatus(
                "Output copied.",
                "success"
            );

        } catch {

            output.focus();
            output.select();

            document.execCommand("copy");

            setStatus(
                "Output copied.",
                "success"
            );
        }
    }
);


// =====================================================
// DOWNLOAD
// =====================================================

downloadButton.addEventListener(
    "click",
    () => {

        if (!output.value) {

            setStatus(
                "There is no output to download.",
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


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(url);


        setStatus(
            "Protected Lua file downloaded.",
            "success"
        );
    }
);


// =====================================================
// LIVE CHARACTER COUNTER
// =====================================================

source.addEventListener(
    "input",
    updateInfo
);


// =====================================================
// INITIALIZE
// =====================================================

updateInfo();
setStatus("");
