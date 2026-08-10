// ============================================================
// KN4GHT VM — PART 2
// Simple VM compiler
// ============================================================

class Kn4ghtCompiler {

    constructor() {
        this.constants = [];
        this.instructions = [];
    }

    addConstant(value) {
        const existing = this.constants.indexOf(value);

        if (existing !== -1) {
            return existing;
        }

        this.constants.push(value);

        return this.constants.length - 1;
    }

    emit(op, ...args) {
        this.instructions.push({
            op: op,
            args: args
        });
    }

    compileNumber(register, value) {
        const constant = this.addConstant(value);

        this.emit(
            "LOADK",
            register,
            constant
        );
    }

    compileAdd(destination, left, right) {
        this.emit(
            "ADD",
            destination,
            left,
            right
        );
    }

    compileSub(destination, left, right) {
        this.emit(
            "SUB",
            destination,
            left,
            right
        );
    }

    compileMul(destination, left, right) {
        this.emit(
            "MUL",
            destination,
            left,
            right
        );
    }

    compileDiv(destination, left, right) {
        this.emit(
            "DIV",
            destination,
            left,
            right
        );
    }

    compileBit32(operation, destination, left, right) {

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
                "Unknown bit32 operation: " + operation
            );
        }

        this.emit(
            opcode,
            destination,
            left,
            right
        );
    }

    compileBit32Not(destination, source) {
        this.emit(
            "BNOT",
            destination,
            source
        );
    }

    print(register) {
        this.emit(
            "PRINT",
            register
        );
    }

    finish() {
        this.emit("HALT");

        return {
            constants: this.constants,
            instructions: this.instructions
        };
    }
}


// ============================================================
// EXPORT
// ============================================================

if (typeof module !== "undefined") {
    module.exports = Kn4ghtCompiler;
          }
