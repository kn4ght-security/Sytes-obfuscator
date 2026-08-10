// ============================================================
// KN4GHT VM — PART 1
// Basic custom virtual machine instruction system
// ============================================================

class Kn4ghtVM {
    constructor() {
        this.stack = [];
        this.registers = {};
        this.constants = [];
        this.instructions = [];
        this.ip = 0;
    }

    load(program) {
        this.constants = program.constants || [];
        this.instructions = program.instructions || [];
        this.stack = [];
        this.registers = {};
        this.ip = 0;
    }

    run() {
        while (this.ip < this.instructions.length) {
            const instruction = this.instructions[this.ip];

            if (!instruction) {
                break;
            }

            this.execute(instruction);
        }
    }

    execute(instruction) {
        const op = instruction.op;
        const args = instruction.args || [];

        switch (op) {

            case "LOADK":
                this.registers[args[0]] = this.constants[args[1]];
                this.ip++;
                break;

            case "MOVE":
                this.registers[args[0]] =
                    this.registers[args[1]];

                this.ip++;
                break;

            case "PUSH":
                this.stack.push(
                    this.registers[args[0]]
                );

                this.ip++;
                break;

            case "POP":
                this.registers[args[0]] =
                    this.stack.pop();

                this.ip++;
                break;

            case "ADD":
                this.registers[args[0]] =
                    this.registers[args[1]] +
                    this.registers[args[2]];

                this.ip++;
                break;

            case "SUB":
                this.registers[args[0]] =
                    this.registers[args[1]] -
                    this.registers[args[2]];

                this.ip++;
                break;

            case "MUL":
                this.registers[args[0]] =
                    this.registers[args[1]] *
                    this.registers[args[2]];

                this.ip++;
                break;

            case "DIV":
                this.registers[args[0]] =
                    this.registers[args[1]] /
                    this.registers[args[2]];

                this.ip++;
                break;

            case "PRINT":
                console.log(
                    this.registers[args[0]]
                );

                this.ip++;
                break;

            case "HALT":
                this.ip = this.instructions.length;
                break;

            default:
                throw new Error(
                    "Unknown VM instruction: " + op
                );
        }
    }
}


// Export for Node.js
if (typeof module !== "undefined") {
    module.exports = Kn4ghtVM;
    }
