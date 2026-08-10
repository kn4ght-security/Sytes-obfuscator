--==============================================================
-- KN4GHT LUAVM RUNTIME
-- Standalone Luau VM prototype
--==============================================================

local VM = {}

VM.__index = VM

function VM.new(constants, instructions)
    return setmetatable({
        constants = constants or {},
        instructions = instructions or {},
        registers = {},
        stack = {},
        pc = 1,
        running = false
    }, VM)
end

function VM:run()
    self.running = true

    while self.running do
        local ins = self.instructions[self.pc]

        if not ins then
            break
        end

        local op = ins[1]

        if op == "LOADK" then
            self.registers[ins[2]] =
                self.constants[ins[3]]

            self.pc += 1

        elseif op == "MOVE" then
            self.registers[ins[2]] =
                self.registers[ins[3]]

            self.pc += 1

        elseif op == "ADD" then
            self.registers[ins[2]] =
                self.registers[ins[3]] +
                self.registers[ins[4]]

            self.pc += 1

        elseif op == "SUB" then
            self.registers[ins[2]] =
                self.registers[ins[3]] -
                self.registers[ins[4]]

            self.pc += 1

        elseif op == "MUL" then
            self.registers[ins[2]] =
                self.registers[ins[3]] *
                self.registers[ins[4]]

            self.pc += 1

        elseif op == "DIV" then
            self.registers[ins[2]] =
                self.registers[ins[3]] /
                self.registers[ins[4]]

            self.pc += 1

        elseif op == "BAND" then
            self.registers[ins[2]] =
                bit32.band(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "BOR" then
            self.registers[ins[2]] =
                bit32.bor(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "BXOR" then
            self.registers[ins[2]] =
                bit32.bxor(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "BNOT" then
            self.registers[ins[2]] =
                bit32.bnot(
                    self.registers[ins[3]]
                )

            self.pc += 1

        elseif op == "LSHIFT" then
            self.registers[ins[2]] =
                bit32.lshift(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "RSHIFT" then
            self.registers[ins[2]] =
                bit32.rshift(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "ARSHIFT" then
            self.registers[ins[2]] =
                bit32.arshift(
                    self.registers[ins[3]],
                    self.registers[ins[4]]
                )

            self.pc += 1

        elseif op == "PRINT" then
            print(self.registers[ins[2]])
            self.pc += 1

        elseif op == "HALT" then
            self.running = false

        else
            error(
                "Unknown VM opcode: " ..
                tostring(op) ..
                " at instruction " ..
                tostring(self.pc)
            )
        end
    end

    return self.registers
end

--==============================================================
-- TEST PROGRAM
--==============================================================

local constants = {
    10,
    20
}

local instructions = {
    {"LOADK", 0, 1},
    {"LOADK", 1, 2},
    {"ADD", 2, 0, 1},
    {"PRINT", 2},
    {"HALT"}
}

local vm = VM.new(
    constants,
    instructions
)

vm:run()
