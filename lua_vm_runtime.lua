-- ============================================================
-- KN4GHT LUAVM RUNTIME
-- Runtime + bytecode test
-- ============================================================

local VM = {}
VM.__index = VM


-- ============================================================
-- CREATE VM
-- ============================================================

function VM.new()
    return setmetatable({
        constants = {},
        instructions = {},
        registers = {},
        pc = 1,
        running = false
    }, VM)
end


-- ============================================================
-- LOAD BYTECODE
-- ============================================================

function VM:load(constants, instructions)
    self.constants = constants or {}
    self.instructions = instructions or {}
    self.registers = {}
    self.pc = 1
end


-- ============================================================
-- EXECUTE
-- ============================================================

function VM:run()
    self.running = true

    while self.running do

        local instruction =
            self.instructions[self.pc]

        if not instruction then
            break
        end

        local opcode = instruction[1]


        -- LOAD CONSTANT
        if opcode == "LOADK" then

            local register =
                instruction[2]

            local constant =
                instruction[3]

            self.registers[register] =
                self.constants[constant]

            self.pc += 1


        -- MOVE
        elseif opcode == "MOVE" then

            self.registers[
                instruction[2]
            ] =
                self.registers[
                    instruction[3]
                ]

            self.pc += 1


        -- ADD
        elseif opcode == "ADD" then

            self.registers[
                instruction[2]
            ] =
                self.registers[
                    instruction[3]
                ]
                +
                self.registers[
                    instruction[4]
                ]

            self.pc += 1


        -- SUB
        elseif opcode == "SUB" then

            self.registers[
                instruction[2]
            ] =
                self.registers[
                    instruction[3]
                ]
                -
                self.registers[
                    instruction[4]
                ]

            self.pc += 1


        -- MUL
        elseif opcode == "MUL" then

            self.registers[
                instruction[2]
            ] =
                self.registers[
                    instruction[3]
                ]
                *
                self.registers[
                    instruction[4]
                ]

            self.pc += 1


        -- DIV
        elseif opcode == "DIV" then

            self.registers[
                instruction[2]
            ] =
                self.registers[
                    instruction[3]
                ]
                /
                self.registers[
                    instruction[4]
                ]

            self.pc += 1


        -- BIT32 AND
        elseif opcode == "BAND" then

            self.registers[
                instruction[2]
            ] =
                bit32.band(
                    self.registers[
                        instruction[3]
                    ],
                    self.registers[
                        instruction[4]
                    ]
                )

            self.pc += 1


        -- BIT32 OR
        elseif opcode == "BOR" then

            self.registers[
                instruction[2]
            ] =
                bit32.bor(
                    self.registers[
                        instruction[3]
                    ],
                    self.registers[
                        instruction[4]
                    ]
                )

            self.pc += 1


        -- BIT32 XOR
        elseif opcode == "BXOR" then

            self.registers[
                instruction[2]
            ] =
                bit32.bxor(
                    self.registers[
                        instruction[3]
                    ],
                    self.registers[
                        instruction[4]
                    ]
                )

            self.pc += 1


        -- BIT32 NOT
        elseif opcode == "BNOT" then

            self.registers[
                instruction[2]
            ] =
                bit32.bnot(
                    self.registers[
                        instruction[3]
                    ]
                )

            self.pc += 1


        -- PRINT
        elseif opcode == "PRINT" then

            print(
                self.registers[
                    instruction[2]
                ]
            )

            self.pc += 1


        -- HALT
        elseif opcode == "HALT" then

            self.running = false


        else

            error(
                "Unknown opcode: "
                .. tostring(opcode)
                .. " at PC "
                .. tostring(self.pc)
            )

        end
    end

    return self.registers
end


-- ============================================================
-- TEST
-- ============================================================

local vm = VM.new()

vm:load(
    {
        10,
        20
    },

    {
        {"LOADK", 0, 1},
        {"LOADK", 1, 2},
        {"ADD", 2, 0, 1},
        {"PRINT", 2},
        {"HALT"}
    }
)

vm:run()
