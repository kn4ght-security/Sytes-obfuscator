// ============================================================
// KN4GHT VM
// Virtual Machine Runtime
// ============================================================

class Kn4ghtVM {

    constructor() {
        this.stack = [];
        this.registers = {};
        this.constants = [];
        this.instructions = [];
        this.ip = 0;
        this.running = false;
    }


    // ========================================================
    // LOAD PROGRAM
    // ========================================================

    load(program) {

        if (!program) {
            throw new Error("VM: No program supplied");
        }

        this.constants =
            Array.isArray(program.constants)
                ? program.constants
                : [];

        this.instructions =
            Array.isArray(program.instructions)
                ? program.instructions
                : [];

        this.stack = [];
        this.registers = {};
        this.ip = 0;
        this.running = false;
    }


    // ========================================================
    // RUN PROGRAM
    // ========================================================

    run() {

        this.running = true;

        while (
            this.running &&
            this.ip < this.instructions.length
        ) {

            const instruction =
                this.instructions[this.ip];

            if (!instruction) {
                throw new Error(
                    "VM: Invalid instruction at " +
                    this.ip
                );
            }

            this.execute(instruction);
        }

        return this.registers;
    }


    // ========================================================
    // EXECUTE INSTRUCTION
    // ========================================================

    execute(instruction) {

        const op = instruction.op;
        const args = instruction.args || [];


        switch (op) {


            // =================================================
            // CONSTANTS
            // =================================================

            case "LOADK":

                this.registers[args[0]] =
                    this.constants[args[1]];

                this.ip++;

                break;


            // =================================================
            // REGISTER MOVE
            // =================================================

            case "MOVE":

                this.registers[args[0]] =
                    this.registers[args[1]];

                this.ip++;

                break;


            // =================================================
            // STACK
            // =================================================

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


            // =================================================
            // ARITHMETIC
            // =================================================

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


            // =================================================
            // BIT32 STYLE OPERATIONS
            // =================================================

            case "BAND":

                this.registers[args[0]] =
                    (
                        this.registers[args[1]] &
                        this.registers[args[2]]
                    ) >>> 0;

                this.ip++;

                break;


            case "BOR":

                this.registers[args[0]] =
                    (
                        this.registers[args[1]] |
                        this.registers[args[2]]
                    ) >>> 0;

                this.ip++;

                break;


            case "BXOR":

                this.registers[args[0]] =
                    (
                        this.registers[args[1]] ^
                        this.registers[args[2]]
                    ) >>> 0;

                this.ip++;

                break;


            case "BNOT":

                this.registers[args[0]] =
                    (
                        ~this.registers[args[1]]
                    ) >>> 0;

                this.ip++;

                break;


            case "LSHIFT":

                this.registers[args[0]] =
                    (
                        this.registers[args[1]] <<
                        this.registers[args[2]]
                    ) >>> 0;

                this.ip++;

                break;


            case "RSHIFT":

                this.registers[args[0]] =
                    (
                        this.registers[args[1]] >>>
                        this.registers[args[2]]
                    ) >>> 0;

                this.ip++;

                break;


            case "ARSHIFT":

                this.registers[args[0]] =
                    this.registers[args[1]] >>
                    this.registers[args[2]];

                this.ip++;

                break;


            // =================================================
            // OUTPUT
            // =================================================

            case "PRINT":

                console.log(
                    this.registers[args[0]]
                );

                this.ip++;

                break;


            // =================================================
            // HALT
            // =================================================

            case "HALT":

                this.running = false;

                this.ip =
                    this.instructions.length;

                break;


            // =================================================
            // UNKNOWN OPCODE
            // =================================================

            default:

                throw new Error(
                    "VM: Unknown instruction '" +
                    op +
                    "' at position " +
                    this.ip
                );
        }
    }
}


// ============================================================
// EXPORT
// ============================================================

if (
    typeof module !== "undefined" &&
    module.exports
) {
    module.exports = Kn4ghtVM;
}


// Browser global
if (typeof window !== "undefined") {
    window.Kn4ghtVM = Kn4ghtVM;
}
