// ============================================================
// SYTES OBFUSCATOR
// script.js
// Frontend controller
// ============================================================

"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const input =
        document.querySelector("#input") ||
        document.querySelector("#inputCode") ||
        document.querySelector("#source");

    const output =
        document.querySelector("#output") ||
        document.querySelector("#outputCode") ||
        document.querySelector("#result");

    const obfuscateButton =
        document.querySelector("#obfuscate") ||
        document.querySelector("#obfuscateBtn") ||
        document.querySelector("#run");

    const clearButton =
        document.querySelector("#clear") ||
        document.querySelector("#clearBtn");

    const copyButton =
        document.querySelector("#copy") ||
        document.querySelector("#copyBtn");

    const status =
        document.querySelector("#status");

    // ----------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------

    function setStatus(message, type = "normal") {
        if (!status) return;

        status.textContent = message;

        status.dataset.status = type;
    }

    function getInput() {
        if (!input) {
            throw new Error(
                "Input element was not found."
            );
        }

        return input.value || "";
    }

    function setOutput(value) {
        if (!output) {
            throw new Error(
                "Output element was not found."
            );
        }

        output.value = value;
    }

    function randomSeed() {
        if (
            window.Kn4ghtVM &&
            typeof window.Kn4ghtVM.createSeed ===
                "function"
        ) {
            return window.Kn4ghtVM.createSeed();
        }

        return (
            Math.random()
                .toString(36)
                .slice(2) +
            Date.now()
                .toString(36)
        );
    }

    // ----------------------------------------------------------
    // Compiler check
    // ----------------------------------------------------------

    function getCompiler() {
        if (
            !window.Kn4ghtCompiler ||
            typeof window.Kn4ghtCompiler.compile !==
                "function"
        ) {
            throw new Error(
                "Kn4ghtCompiler is unavailable. " +
                "Make sure vm.js loads before compiler.js."
            );
        }

        return window.Kn4ghtCompiler;
    }

    // ----------------------------------------------------------
    // Obfuscate
    // ----------------------------------------------------------

    function runObfuscator() {
        try {
            const source =
                getInput();

            if (!source.trim()) {
                setOutput("");
                setStatus(
                    "Enter Luau code first.",
                    "error"
                );
                return;
            }

            const compiler =
                getCompiler();

            setStatus(
                "Obfuscating...",
                "working"
            );

            const result =
                compiler.compile(
                    source,
                    {
                        seed:
                            randomSeed(),

                        mangleIdentifiers:
                            true
                    }
                );

            if (
                !result ||
                typeof result.code !==
                    "string"
            ) {
                throw new Error(
                    "Compiler returned invalid output."
                );
            }

            setOutput(
                result.code
            );

            setStatus(
                "Obfuscation complete.",
                "success"
            );

        } catch (error) {
            console.error(
                "Sytes compiler error:",
                error
            );

            setStatus(
                error.message ||
                "Obfuscation failed.",
                "error"
            );

            if (output) {
                output.value =
                    "-- Compiler error:\n" +
                    String(
                        error.message ||
                        error
                    );
            }
        }
    }

    // ----------------------------------------------------------
    // Clear
    // ----------------------------------------------------------

    function clearAll() {
        if (input) {
            input.value = "";
        }

        if (output) {
            output.value = "";
        }

        setStatus(
            "Cleared.",
            "normal"
        );
    }

    // ----------------------------------------------------------
    // Copy
    // ----------------------------------------------------------

    async function copyOutput() {
        try {
            if (!output) {
                throw new Error(
                    "Output element was not found."
                );
            }

            const value =
                output.value || "";

            if (!value) {
                setStatus(
                    "Nothing to copy.",
                    "error"
                );
                return;
            }

            await navigator.clipboard.writeText(
                value
            );

            setStatus(
                "Output copied.",
                "success"
            );

        } catch (error) {
            console.error(
                "Copy error:",
                error
            );

            // Fallback for older/mobile browsers
            try {
                output.focus();
                output.select();

                document.execCommand(
                    "copy"
                );

                setStatus(
                    "Output copied.",
                    "success"
                );

            } catch {
                setStatus(
                    "Unable to copy output.",
                    "error"
                );
            }
        }
    }

    // ----------------------------------------------------------
    // Button events
    // ----------------------------------------------------------

    if (obfuscateButton) {
        obfuscateButton.addEventListener(
            "click",
            runObfuscator
        );
    } else {
        console.warn(
            "Obfuscate button not found."
        );
    }

    if (clearButton) {
        clearButton.addEventListener(
            "click",
            clearAll
        );
    }

    if (copyButton) {
        copyButton.addEventListener(
            "click",
            copyOutput
        );
    }

    // ----------------------------------------------------------
    // Keyboard shortcut
    // Ctrl + Enter / Cmd + Enter
    // ----------------------------------------------------------

    document.addEventListener(
        "keydown",
        event => {
            if (
                (event.ctrlKey ||
                    event.metaKey) &&
                event.key === "Enter"
            ) {
                event.preventDefault();

                runObfuscator();
            }
        }
    );

    // ----------------------------------------------------------
    // Public API
    // ----------------------------------------------------------

    window.SytesObfuscator = {
        obfuscate:
            runObfuscator,

        clear:
            clearAll,

        copy:
            copyOutput
    };

    // ----------------------------------------------------------
    // Startup
    // ----------------------------------------------------------

    if (
        window.Kn4ghtCompiler
    ) {
        setStatus(
            "Compiler ready.",
            "success"
        );
    } else {
        setStatus(
            "Compiler not loaded.",
            "error"
        );
    }

    console.log(
        "Sytes Obfuscator frontend loaded."
    );
});
