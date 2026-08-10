const Kn4ghtVM = require("./vm.js");
const Kn4ghtCompiler = require("./compiler.js");

const compiler = new Kn4ghtCompiler();

compiler.compileNumber(0, 123);
compiler.compileNumber(1, 456);

compiler.compileBit32(
    "bxor",
    2,
    0,
    1
);

compiler.print(2);

const program = compiler.finish();

const vm = new Kn4ghtVM();

vm.load(program);
vm.run();
