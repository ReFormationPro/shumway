load("../util.js");

var options = new OptionSet("option(s)");

var disassemble = options.register(new Option("disassemble", "d", false, "disassemble"));
var traceLevel = options.register(new Option("traceLevel", "t", 0, "trace level"));
var traceGraphViz = options.register(new Option("traceGraphViz", "v", false, "trace GraphViz output"));
var execute = options.register(new Option("execute", "x", false, "execute"));
var help = options.register(new Option("help", "h", false, "prints help"));

load("../avm2-runtime.js");
load("../DataView.js");
load("../constants.js");
load("../opcodes.js");
load("../parser.js");
load("../analyze.js");
load("../compiler.js");
load("../fuzzer.js");
load("../viz.js");
load("../disassembler.js");
load("../interpreter.js");

if (arguments.length === 0) {
  printUsage();
  quit();
}

function printUsage() {
  print("avm: [option(s)] file");
  options.trace(new IndentingWriter());
}

var file = arguments[arguments.length - 1];
options.parse(arguments.slice(0, arguments.length - 1));

if (help.value) {
  printUsage();
  quit();
}

var abc = new AbcFile(snarf(file, "binary"));
var methodBodies = abc.methodBodies;

if (disassemble.value) {
  abc.trace(new IndentingWriter(false));
}

if (traceGraphViz.value) {
  var writer = new IndentingWriter(false);
  writer.enter("digraph {");
  var graph = 0;
  var opts = { chokeOnClusterfucks: true,
               splitLoops: true };
  abc.methods.forEach(function (method) {
    method.analysis = new Analysis(method, opts);
    method.analysis.analyzeControlFlow();
    method.analysis.restructureControlFlow();
    if (method.analysis) {
      method.analysis.traceCFG(writer, method, "G" + graph + "_");
      graph += 1;
    }
  });
  writer.leave("}");
}

if (execute.value) {
  try {
    executeAbc(abc);
  } catch(e) {
    print(e);
    print("");
    print(e.stack);
  }

  if (traceLevel.value > 4) {
    /* Spew analysis information if not quiet. */
    var writer = new IndentingWriter(false);
    writer.enter("analyses {");
    abc.methods.forEach(function (method) {
      if (method.analysis) {
        method.analysis.trace(writer);
      }
    });
    writer.leave("}");
  }
}
