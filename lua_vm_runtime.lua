-- ============================================================
-- KN4GHT VM
-- Luau-side VM runtime prototype
-- ============================================================

local VM = {}

VM.__index = VM


-- ============================================================
-- CREATE VM
-- ============================================================

function VM.new()
    local self = setmetatable({}, VM)

    self.registers = {}
    self.stack = {}
    self.constants = {}
    self.instructions = {}

    self.ip = 1
    self.running = false

    return self
end


-- ============================================================
-- LOAD PROGRAM
-- ============================================================

function VM:load(program)
    assert(
        type(program) == "table",
        "VM: invalid program"
    )

    self.constants =
        program.constants or {}

    self.instructions =
        program.instructions or {}

    self.registers = {}
    self.stack = {}

    self.ip = 1
    self.running = false
end


-- ============================================================
-- EXECUTE ONE INSTRUCTION
-- ============================================================

function VM:execute(instruction)

    local op = instruction[1]


    -- ========================================================
    -- CONSTANT
    -- ========================================================

    if op == "LOADK" then

        local destination = instruction[2]
        local constant = instruction[3]

        self.registers[destination] =
            self.constants[constant]

        self.ip += 1

        return
    end


    -- ========================================================
    -- MOVE
    -- ========================================================

    if op == "MOVE" then

        local destination = instruction[2]
        local source = instruction[3]

        self.registers[destination] =
            self.registers[source]

        self.ip += 1

        return
    end


    -- ========================================================
    -- STACK
    -- ========================================================

    if op == "PUSH" then

        local source = instruction[2]

        self.stack[#self.stack + 1] =
            self.registers[source]

        self.ip += 1

        return
    end


    if op == "POP" then

        local destination = instruction[2]

        self.registers[destination] =
            table.remove(self.stack)

        self.ip += 1

        return
    end


    -- ========================================================
    -- ARITHMETIC
    -- ========================================================

    if op == "ADD" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            self.registers[left] +
            self.registers[right]

        self.ip += 1

        return
    end


    if op == "SUB" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            self.registers[left] -
            self.registers[right]

        self.ip += 1

        return
    end


    if op == "MUL" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            self.registers[left] *
            self.registers[right]

        self.ip += 1

        return
    end


    if op == "DIV" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            self.registers[left] /
            self.registers[right]

        self.ip += 1

        return
    end


    -- ========================================================
    -- BITWISE
    -- ========================================================

    if op == "BAND" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.band(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    if op == "BOR" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.bor(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    if op == "BXOR" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.bxor(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    if op == "BNOT" then

        local destination = instruction[2]
        local source = instruction[3]

        self.registers[destination] =
            bit32.bnot(
                self.registers[source]
            )

        self.ip += 1

        return
    end


    if op == "LSHIFT" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.lshift(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    if op == "RSHIFT" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.rshift(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    if op == "ARSHIFT" then

        local destination = instruction[2]
        local left = instruction[3]
        local right = instruction[4]

        self.registers[destination] =
            bit32.arshift(
                self.registers[left],
                self.registers[right]
            )

        self.ip += 1

        return
    end


    -- ========================================================
    -- PRINT
    -- ========================================================

    if op == "PRINT" then

        local source = instruction[2]

        print(
            self.registers[source]
        )

        self.ip += 1

        return
    end


    -- ========================================================
    -- HALT
    -- ========================================================

    if op == "HALT" then

        self.running = false

        return
    end


    error(
        "KN4GHT VM: unknown opcode " ..
        tostring(op) ..
        " at instruction " ..
        tostring(self.ip)
    )
end


-- ============================================================
-- RUN
-- ============================================================

function VM:run()

    self.running = true

    while self.running do

        local instruction =
            self.instructions[self.ip]

        if not instruction then
            break
        end

        self:execute(instruction)
    end

    return self.registers
end


return VM
