"use strict";

const sourceCode = document.getElementById("sourceCode");
const outputCode = document.getElementById("outputCode");

const fileInput = document.getElementById("fileInput");

const obfuscateBtn = document.getElementById("obfuscateBtn");
const clearBtn = document.getElementById("clearBtn");
const resetBtn = document.getElementById("resetBtn");

const copyBtn = document.getElementById("copyBtn");
const downloadBtn = document.getElementById("downloadBtn");

const inputSize = document.getElementById("inputSize");
const outputSize = document.getElementById("outputSize");

const statusBox = document.getElementById("status");
const buttonText = document.getElementById("buttonText");

const renameIdentifiers =
    document.getElementById("renameIdentifiers");

const encodeStrings =
    document.getElementById("encodeStrings");

const removeComments =
    document.getElementById("removeComments");

const minify =
    document.getElementById("minify");


// --------------------------------------------------
// UI
// --------------------------------------------------

function updateInputSize() {
    inputSize.textContent =
        `${sourceCode.value.length.toLocaleString()} characters`;
}

function updateOutputSize() {
    outputSize.textContent =
        `${outputCode.value.length.toLocaleString()} characters`;
}

function setStatus(message, type = "") {
    statusBox.textContent = message;
    statusBox.className = "status";

    if (type) {
        statusBox.classList.add(type);
    }
}


// --------------------------------------------------
// Random names
// --------------------------------------------------

function randomIdentifier(index) {
    const alphabet =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    let result = "_";

    let seed = index * 7919 + 17;

    for (let i = 0; i < 7; i++) {
        seed =
            (seed * 1664525 + 1013904223) >>> 0;

        result += alphabet[
            seed % alphabet.length
        ];
    }

    return result;
}


// --------------------------------------------------
// Lua keywords
// --------------------------------------------------

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


// --------------------------------------------------
// Built-in globals
// --------------------------------------------------

const protectedGlobals = new Set([
    "assert",
    "collectgarbage",
    "dofile",
    "error",
    "getmetatable",
    "ipairs",
    "load",
    "loadfile",
    "next",
    "pairs",
    "pcall",
    "print",
    "rawequal",
    "rawget",
    "rawlen",
    "rawset",
    "require",
    "select",
    "setmetatable",
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
    "shared",

    "true",
    "false",
    "nil"
]);


// --------------------------------------------------
// Remove comments safely enough for normal source
// --------------------------------------------------

function stripComments(code) {

    // Long comments
    code = code.replace(
        /--\[(=*)\[[\s\S]*?\]\1\]/g,
        ""
    );

    // Single-line comments
    code = code.replace(
        /--[^\n\r]*/g,
        ""
    );

    return code;
}


// --------------------------------------------------
// String encoding
// --------------------------------------------------

function encodeLuaStrings(code) {

    return code.replace(
        /(["'])(.*?)\1/g,
        function (_, quote, value) {

            // Don't transform empty strings
            if (!value.length) {
                return quote + quote;
            }

            let bytes = [];

            for (let i = 0; i < value.length; i++) {
                bytes.push(
                    value.charCodeAt(i)
                );
            }

            // Lua-compatible numeric string construction
            const parts = bytes.map(
                byte => "\\" + byte
            );

            return '"' + parts.join("") + '"';
        }
    );
}


// --------------------------------------------------
// Find local identifiers
// --------------------------------------------------

function collectIdentifiers(code) {

    const identifiers = new Set();

    // local variable declarations
    const localPattern =
        /\blocal\s+([A-Za-z_][A-Za-z0-9_]*)/g;

    let match;

    while ((match = localPattern.exec(code))) {

        const name = match[1];

        if (
            !luaKeywords.has(name) &&
            !protectedGlobals.has(name)
        ) {
            identifiers.add(name);
        }
    }


    // local function declarations
    const localFunctionPattern =
        /\blocal\s+function\s+([A-Za-z_][A-Za-z0-9_]*)/g;

    while ((match = localFunctionPattern.exec(code))) {

        const name = match[1];

        if (
            !luaKeywords.has(name) &&
            !protectedGlobals.has(name)
        ) {
            identifiers.add(name);
        }
    }


    return [...identifiers];
}


// --------------------------------------------------
// Rename identifiers
// --------------------------------------------------

function renameLocalIdentifiers(code) {

    const identifiers =
        collectIdentifiers(code);

    const mapping = new Map();

    identifiers.forEach(
        (name, index) => {
            mapping.set(
                name,
                randomIdentifier(index)
            );
        }
    );


    for (const [oldName, newName] of mapping) {

        const pattern =
            new RegExp(
                "\\b" +
                oldName.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                ) +
                "\\b",
                "g"
            );

        code = code.replace(
            pattern,
            newName
        );
    }


    return code;
}


// --------------------------------------------------
// Basic whitespace minification
// --------------------------------------------------

function minifyLua(code) {

    code = code
        .replace(/[ \t]+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .replace(/^\s+|\s+$/g, "");

    return code;
}


// --------------------------------------------------
// Main obfuscator
// --------------------------------------------------

function obfuscate(code) {

    if (!code.trim()) {
        throw new Error(
            "Please enter some Lua/Luau code first."
        );
    }


    // Safety check
    if (code.length > 1000000) {
        throw new Error(
            "The source code is too large."
        );
    }


    let result = code;


    if (removeComments.checked) {
        result = stripComments(result);
    }


    if (encodeStrings.checked) {
        result = encodeLuaStrings(result);
    }


    if (renameIdentifiers.checked) {
        result = renameLocalIdentifiers(result);
    }


    if (minify.checked) {
        result = minifyLua(result);
    }


    return result;
}


// --------------------------------------------------
// Obfuscate button
// --------------------------------------------------

obfuscateBtn.addEventListener(
    "click",
    async () => {

        try {

            buttonText.textContent =
                "Processing...";

            obfuscateBtn.disabled = true;

            setStatus(
                "Protecting your code...",
                "loading"
            );


            // Small delay for UI feedback
            await new Promise(
                resolve => setTimeout(resolve, 150)
            );


            const result =
                obfuscate(sourceCode.value);


            outputCode.value = result;

            updateOutputSize();


            setStatus(
                "Obfuscation completed successfully.",
                "success"
            );

        } catch (error) {

            outputCode.value = "";

            setStatus(
                error.message ||
                "Obfuscation failed.",
                "error"
            );

        } finally {

            buttonText.textContent =
                "Obfuscate Code";

            obfuscateBtn.disabled = false;
        }
    }
);


// --------------------------------------------------
// File upload
// --------------------------------------------------

fileInput.addEventListener(
    "change",
    event => {

        const file =
            event.target.files[0];

        if (!file) return;


        const validExtensions =
            [".lua", ".luau", ".txt"];

        const valid =
            validExtensions.some(
                ext =>
                    file.name
                        .toLowerCase()
                        .endsWith(ext)
            );


        if (!valid) {

            setStatus(
                "Please upload a .lua, .luau, or .txt file.",
                "error"
            );

            fileInput.value = "";

            return;
        }


        if (file.size > 1000000) {

            setStatus(
                "File is too large. Maximum size is 1 MB.",
                "error"
            );

            fileInput.value = "";

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            sourceCode.value =
                reader.result;

            updateInputSize();

            setStatus(
                `${file.name} loaded successfully.`,
                "success"
            );
        };


        reader.onerror = () => {

            setStatus(
                "Unable to read the file.",
                "error"
            );
        };


        reader.readAsText(file);
    }
);


// --------------------------------------------------
// Clear
// --------------------------------------------------

clearBtn.addEventListener(
    "click",
    () => {

        sourceCode.value = "";

        outputCode.value = "";

        fileInput.value = "";

        updateInputSize();
        updateOutputSize();

        setStatus("");
    }
);


// --------------------------------------------------
// Reset settings
// --------------------------------------------------

resetBtn.addEventListener(
    "click",
    () => {

        renameIdentifiers.checked = true;
        encodeStrings.checked = true;
        removeComments.checked = true;
        minify.checked = false;

        setStatus(
            "Protection settings reset.",
            "success"
        );
    }
);


// --------------------------------------------------
// Copy output
// --------------------------------------------------

copyBtn.addEventListener(
    "click",
    async () => {

        if (!outputCode.value) {

            setStatus(
                "There is no output to copy.",
                "error"
            );

            return;
        }


        try {

            await navigator.clipboard.writeText(
                outputCode.value
            );

            setStatus(
                "Protected code copied to clipboard.",
                "success"
            );

        } catch {

            outputCode.select();

            document.execCommand("copy");

            setStatus(
                "Protected code copied.",
                "success"
            );
        }
    }
);


// --------------------------------------------------
// Download
// --------------------------------------------------

downloadBtn.addEventListener(
    "click",
    () => {

        if (!outputCode.value) {

            setStatus(
                "There is no output to download.",
                "error"
            );

            return;
        }


        const blob =
            new Blob(
                [outputCode.value],
                {
                    type: "text/plain;charset=utf-8"
                }
            );


        const url =
            URL.createObjectURL(blob);


        const link =
            document.createElement("a");

        link.href = url;

        link.download =
            "luashield-protected.lua";


        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);


        setStatus(
            "Protected file downloaded.",
            "success"
        );
    }
);


// --------------------------------------------------
// Input statistics
// --------------------------------------------------

sourceCode.addEventListener(
    "input",
    updateInputSize
);


updateInputSize();
updateOutputSize();