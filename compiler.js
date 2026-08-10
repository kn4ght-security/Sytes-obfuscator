// ============================================================
// KN4GHT VM COMPILER
// Part 3 - Lexer + Expression Compiler
// ============================================================

class Kn4ghtCompiler {

    constructor() {
        this.constants = [];
        this.instructions = [];
        this.registerCount = 0;
    }

    // ========================================================
    // CONSTANT TABLE
    // ========================================================

    addConstant(value) {
        const index = this.constants.indexOf(value);

        if (index !== -1) {
            return index;
        }

        this.constants.push(value);

        return this.constants.length - 1;
    }

    // ========================================================
    // REGISTER MANAGEMENT
    // ========================================================

    newRegister() {
        const register = this.registerCount;

        this.registerCount++;

        return register;
    }

    // ========================================================
    // EMIT INSTRUCTION
    // ========================================================

    emit(op, ...args) {
        this.instructions.push({
            op: op,
            args: args
        });
    }

    // ========================================================
    // BASIC VALUES
    // ========================================================

    compileNumber(value) {
        const register = this.newRegister();
        const constant = this.addConstant(Number(value));

        this.emit(
            "LOADK",
            register,
            constant
        );

        return register;
    }

    compileString(value) {
        const register = this.newRegister();
        const constant = this.addConstant(value);

        this.emit(
            "LOADK",
            register,
            constant
        );

        return register;
    }

    // ========================================================
    // ARITHMETIC
    // ========================================================

    compileBinary(operator, left, right) {

        const destination = this.newRegister();

        const operations = {
            "+": "ADD",
            "-": "SUB",
            "*": "MUL",
            "/": "DIV"
        };

        const opcode = operations[operator];

        if (!opcode) {
            throw new Error(
                "Unsupported operator: " + operator
            );
        }

        this.emit(
            opcode,
            destination,
            left,
            right
        );

        return destination;
    }

    // ========================================================
    // BIT32
    // ========================================================

    compileBit32(operation, left, right) {

        const operations = {
            band: "BAND",
            bor: "BOR",
            bxor: "BXOR",
            lshift: "LSHIFT",
            rshift: "RSHIFT",
            arshift: "ARSHIFT"
        };

        const opcode = operations[operation];

        if (!opcode) {
            throw new Error(
                "Unknown bit32 operation: " +
                operation
            );
        }

        const destination = this.newRegister();

        this.emit(
            opcode,
            destination,
            left,
            right
        );

        return destination;
    }

    compileBit32Not(source) {

        const destination =
            this.newRegister();

        this.emit(
            "BNOT",
            destination,
            source
        );

        return destination;
    }

    // ========================================================
    // TOKENIZER
    // ========================================================

    tokenize(source) {

        const tokens = [];

        let position = 0;

        while (position < source.length) {

            const char = source[position];


            // ------------------------------------------------
            // Whitespace
            // ------------------------------------------------

            if (/\s/.test(char)) {
                position++;
                continue;
            }


            // ------------------------------------------------
            // Comments
            // ------------------------------------------------

            if (
                char === "-" &&
                source[position + 1] === "-"
            ) {

                position += 2;

                while (
                    position < source.length &&
                    source[position] !== "\n"
                ) {
                    position++;
                }

                continue;
            }


            // ------------------------------------------------
            // Numbers
            // ------------------------------------------------

            if (/[0-9]/.test(char)) {

                let value = "";

                while (
                    position < source.length &&
                    /[0-9.]/.test(source[position])
                ) {
                    value += source[position];
                    position++;
                }

                tokens.push({
                    type: "number",
                    value: value
                });

                continue;
            }


            // ------------------------------------------------
            // Strings
            // ------------------------------------------------

            if (
                char === '"' ||
                char === "'"
            ) {

                const quote = char;

                position++;

                let value = "";

                while (
                    position < source.length &&
                    source[position] !== quote
                ) {

                    if (
                        source[position] === "\\" &&
                        position + 1 < source.length
                    ) {

                        value += source[position];
                        position++;

                        value += source[position];
                        position++;

                    } else {

                        value += source[position];
                        position++;
                    }
                }

                position++;

                tokens.push({
                    type: "string",
                    value: value
                });

                continue;
            }


            // ------------------------------------------------
            // Identifiers
            // ------------------------------------------------

            if (/[A-Za-z_]/.test(char)) {

                let value = "";

                while (
                    position < source.length &&
                    /[A-Za-z0-9_]/.test(
                        source[position]
                    )
                ) {

                    value += source[position];

                    position++;
                }

                tokens.push({
                    type: "identifier",
                    value: value
                });

                continue;
            }


            // ------------------------------------------------
            // Operators
            // ------------------------------------------------

            const twoCharacter =
                source.slice(
                    position,
                    position + 2
                );

            if (
                twoCharacter === "==" ||
                twoCharacter === "~=" ||
                twoCharacter === "<=" ||
                twoCharacter === ">="
            ) {

                tokens.push({
                    type: "operator",
                    value: twoCharacter
                });

                position += 2;

                continue;
            }


            // ------------------------------------------------
            // Single character tokens
            // ------------------------------------------------

            if (
                "+-*/%=<>()[],.".includes(char)
            ) {

                tokens.push({
                    type:
                        "+-*/%=<>".includes(char)
                            ? "operator"
                            : "symbol",

                    value: char
                });

                position++;

                continue;
            }


            // ------------------------------------------------
            // Unknown character
            // ------------------------------------------------

            tokens.push({
                type: "unknown",
                value: char
            });

            position++;
        }

        return tokens;
    }

    // ========================================================
    // SIMPLE EXPRESSION COMPILER
    // ========================================================

    compileExpression(source) {

        const tokens =
            this.tokenize(source);

        if (tokens.length === 0) {
            throw new Error(
                "Empty expression"
            );
        }

        return this.compileTokens(tokens);
    }

    // ========================================================
    // TOKEN EXPRESSION HANDLER
    // ========================================================

    compileTokens(tokens) {

        if (tokens.length === 1) {

            const token = tokens[0];

            if (token.type === "number") {
                return this.compileNumber(
                    token.value
                );
            }

            if (token.type === "string") {
                return this.compileString(
                    token.value
                );
            }
        }


        // ----------------------------------------------------
        // Simple binary expression
        // ----------------------------------------------------

        if (tokens.length === 3) {

            const leftToken = tokens[0];
            const operator = tokens[1];
            const rightToken = tokens[2];

            if (
                operator.type === "operator" &&
                ["+", "-", "*", "/"].includes(
                    operator.value
                )
            ) {

                const left =
                    this.compileSingleToken(
                        leftToken
                    );

                const right =
                    this.compileSingleToken(
                        rightToken
                    );

                return this.compileBinary(
                    operator.value,
                    left,
                    right
                );
            }
        }


        throw new Error(
            "Expression is not supported yet"
        );
    }

    // ========================================================
    // SINGLE TOKEN
    // ========================================================

    compileSingleToken(token) {

        if (token.type === "number") {
            return this.compileNumber(
                token.value
            );
        }

        if (token.type === "string") {
            return this.compileString(
                token.value
            );
        }

        throw new Error(
            "Unsupported token: " +
            token.value
        );
    }

    // ========================================================
    // PRINT
    // ========================================================

    print(register) {

        this.emit(
            "PRINT",
            register
        );
    }

    // ========================================================
    // FINISH PROGRAM
    // ========================================================

    finish() {

        this.emit("HALT");

        return {
            constants: this.constants,
            instructions: this.instructions
        };
    }
}


// ============================================================
// BROWSER EXPORT
// ============================================================

if (typeof window !== "undefined") {
    window.Kn4ghtCompiler =
        Kn4ghtCompiler;
}


// ============================================================
// NODE EXPORT
// ============================================================

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports =
        Kn4ghtCompiler;
                    }
