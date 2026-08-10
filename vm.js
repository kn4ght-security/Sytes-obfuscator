// ============================================================
// KN4GHT BROWSER VM TEST
// ============================================================

class Kn4ghtVM {

    constructor() {
        this.constants = [];
        this.instructions = [];
        this.registers = [];
        this.pc = 0;
        this.running = false;
    }

    load(constants, instructions) {
        this.constants = constants || [];
        this.instructions = instructions || [];
        this.registers = [];
        this.pc = 0;
        this.running = false;
    }

    run() {
        this.running = true;

        while (this.running) {

            const instruction =
                this.instructions[this.pc];

            if (!instruction) {
                break;
            }

            const op = instruction[0];

            if (op === "LOADK") {

                this.registers[instruction[1]] =
                    this.constants[instruction[2]];

                this.pc++;

            } else if (op === "ADD") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] +
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "SUB") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] -
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "MUL") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] *
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "DIV") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] /
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "BAND") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] &
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "BOR") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] |
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "BXOR") {

                this.registers[instruction[1]] =
                    this.registers[instruction[2]] ^
                    this.registers[instruction[3]];

                this.pc++;

            } else if (op === "BNOT") {

                this.registers[instruction[1]] =
                    ~this.registers[instruction[2]];

                this.pc++;

            } else if (op === "PRINT") {

                console.log(
                    this.registers[instruction[1]]
                );

                this.pc++;

            } else if (op === "HALT") {

                this.running = false;

            } else {

                throw new Error(
                    "Unknown opcode: " + op
                );
            }
        }

        return this.registers;
    }
}


// ============================================================
// GLOBAL EXPORT
// ============================================================

window.Kn4ghtVM = Kn4ghtVM;
