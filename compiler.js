// ============================================================
// KN4GHT VM COMPILER
// Luau VM bytecode generator
// ============================================================

class Kn4ghtCompiler {

    constructor() {
        this.constants = [];
        this.instructions = [];
        this.registerCount = 0;
    }


    // ========================================================
    // CONSTANTS
    // ========================================================

    addConstant(value) {

        const existing =
            this.constants.indexOf(value);

        if (existing !== -1) {
            return existing;
        }

        this.constants.push(value);

        // VM uses 1-based constant indexes
        return this.constants.length;
    }


    // ========================================================
    // REGISTERS
    // ========================================================

    newRegister() {

        const register =
            this.registerCount;

        this.registerCount++;

        return register;
    }


    // ========================================================
    // EMIT
    // ========================================================

    emit(op, ...args) {

        this.instructions.push([
            op,
            ...args
        ]);
    }


    // ========================================================
    // LOAD NUMBER
    // ========================================================

    compileNumber(value) {

        const register =
            this.newRegister();

        const constant =
            this.addConstant(
                Number(value)
            );

        this.emit(
            "LOADK",
            register,
            constant
        );

        return register;
    }


    // ========================================================
    // LOAD STRING
    // ========================================================

    compileString(value) {

        const register =
            this.newRegister();

        const constant =
            this.addConstant(value);

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

    compileBinary(
        operator,
        left,
        right
    ) {

        const operations = {

            "+": "ADD",
            "-": "SUB",
            "*": "MUL",
            "/": "DIV"

        };

        const opcode =
            operations[operator];

        if (!opcode) {

            throw new Error(
                "Unsupported operator: " +
                operator
            );
        }

        const destination =
            this.newRegister();

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

    compileBit32(
        operation,
        left,
        right
    ) {

        const operations = {

            band: "BAND",
            bor: "BOR",
            bxor: "BXOR",
            lshift: "LSHIFT",
            rshift: "RSHIFT",
            arshift: "ARSHIFT"

        };

        const opcode =
            operations[
                operation.toLowerCase()
            ];

        if (!opcode) {

            throw new Error(
                "Unknown bit32 operation: " +
                operation
            );
        }

        const destination =
            this.newRegister();

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
    // PRINT
    // ========================================================

    print(register) {

        this.emit(
            "PRINT",
            register
        );
    }


    // ========================================================
    // SIMPLE TEST EXPRESSION
    // ========================================================

    compileExpression(expression) {

        const tokens =
            this.tokenize(expression);

        if (tokens.length === 0) {

            throw new Error(
                "Empty expression"
            );
        }


        // Single number

        if (
            tokens.length === 1 &&
            tokens[0].type === "number"
        ) {

            return this.compileNumber(
                tokens[0].value
            );
        }


        // Single string

        if (
            tokens.length === 1 &&
            tokens[0].type === "string"
        ) {

            return this.compileString(
                tokens[0].value
            );
        }


        // Simple:
        // number operator number

        if (tokens.length === 3) {

            const left =
                this.compileToken(
                    tokens[0]
                );

            const operator =
                tokens[1];

            const right =
                this.compileToken(
                    tokens[2]
                );

            return this.compileBinary(
                operator.value,
                left,
                right
            );
        }


        throw new Error(
            "Expression not supported yet: " +
            expression
        );
    }


    // ========================================================
    // TOKEN
    // ========================================================

    compileToken(token) {

        if (
            token.type === "number"
        ) {

            return this.compileNumber(
                token.value
            );
        }


        if (
            token.type === "string"
        ) {

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
    // TOKENIZER
    // ========================================================

    tokenize(source) {

        const tokens = [];

        let position = 0;


        while (
            position < source.length
        ) {

            const char =
                source[position];


            // Whitespace

            if (
                /\s/.test(char)
            ) {

                position++;

                continue;
            }


            // Comments

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


            // Number

            if (
                /[0-9]/.test(char)
            ) {

                let value = "";

                while (
                    position < source.length &&
                    /[0-9.]/.test(
                        source[position]
                    )
                ) {

                    value +=
                        source[position];

                    position++;
                }

                tokens.push({
                    type: "number",
                    value: value
                });

                continue;
            }


            // String

            if (
                char === '"' ||
                char === "'"
            ) {

                const quote =
                    char;

                position++;

                let value = "";

                while (
                    position < source.length &&
                    source[position] !== quote
                ) {

                    value +=
                        source[position];

                    position++;
                }

                position++;

                tokens.push({
                    type: "string",
                    value: value
                });

                continue;
            }


            // Identifier

            if (
                /[A-Za-z_]/.test(char)
            ) {

                let value = "";

                while (
                    position < source.length &&
                    /[A-Za-z0-9_]/.test(
                        source[position]
                    )
                ) {

                    value +=
                        source[position];

                    position++;
                }

                tokens.push({
                    type: "identifier",
                    value: value
                });

                continue;
            }


            // Operators

            if (
                "+-*/%".includes(char)
            ) {

                tokens.push({
                    type: "operator",
                    value: char
                });

                position++;

                continue;
            }


            // Other symbols

            tokens.push({
                type: "symbol",
                value: char
            });

            position++;
        }


        return tokens;
    }


    // ========================================================
    // FINISH
    // ========================================================

    finish() {

        this.emit(
            "HALT"
        );

        return {

            constants:
                this.constants,

            instructions:
                this.instructions,

            registers:
                this.registerCount
        };
    }
}


// ============================================================
// BROWSER EXPORT
// ============================================================

if (
    typeof window !== "undefined"
) {

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
