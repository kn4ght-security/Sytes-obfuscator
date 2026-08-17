-- Luaveil Compiler
-- Converts source code into Luaveil VM input.
-- This is a starter; the instruction format must match mainvm.lua.

local Compiler = {}

function Compiler.new()
    return {
        instructions = {},
        constants = {}
    }
end

function Compiler:addInstruction(opcode, ...)
    self.instructions[#self.instructions + 1] = {
        opcode = opcode,
        args = { ... }
    }
end

function Compiler:addConstant(value)
    local index = #self.constants + 1
    self.constants[index] = value
    return index
end

function Compiler:compile(source)
    assert(type(source) == "string", "source must be a string")

    -- Temporary instruction so we can test the pipeline.
    self:addInstruction("SOURCE", source)

    return {
        instructions = self.instructions,
        constants = self.constants
    }
end

return Compiler
