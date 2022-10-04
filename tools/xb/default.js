// XB Browser - A TI-99/4A Extended Basic source code visualizer
// (c) 2022 Bertrand Le Roy

'use strict'

function el(parent, className = "", text = "", tag = "span", attr = {}) {
    const el = document.createElement(tag);
    el.className = className;
    el.innerText = text;
    for (let attrName in attr) {
        el.setAttribute(attrName, attr[attrName]);
    }
    parent.append(el);
    return el;
}

function addIndentation(el, indent) {
    el.style.marginLeft = (indent * 2) + "em";
}

// This is obviously not how you build a proper parser.
// The idea here is to make the code more readable, not to understand it so it'll do.
function parseAndRenderLine(pane, lineNumber, instructionsStr, indent = 0) {
    const lineEl = el(pane, "line");
    el(lineEl, "line-number", lineNumber);
    const instructionsEl = el(lineEl, "instructions");
    let inString = null;
    let nextPos = 0;
    let remaining = instructionsStr;
    let ifDepth = 0;
    let instructionEl = el(instructionsEl, "instruction");
    addIndentation(instructionEl, indent);
    let firstToken = true;
    const instructions = [];
    let instruction = "";
    let lastInstruction = "";
    let lastTokenClass = "";
    do {
        let nextQuoteIndex;
        if (inString !== null) {
            // We're in a string until the next single double quote
            nextQuoteIndex = remaining.search(quote);
            if (nextQuoteIndex == -1) {
                // This is a syntax error, just cut things short by pretending the line ends with a closing quote
                nextQuoteIndex = remaining.length - 1;
            }
            inString += remaining.substring(0, nextQuoteIndex + 1);
            if (nextQuoteIndex < remaining.length - 1 && remaining.charAt(nextQuoteIndex + 1).search(quote) === 0) {
                // This is a double quote, we're still in the string
                inString += '"';
                nextQuoteIndex++;
            } else {
                // That string is closing
                el(instructionEl, "string", inString.substring(0, inString.length - 1));
                el(instructionEl, "separator", '"');
                inString = null;
            }
            remaining = remaining.substring(nextQuoteIndex + 1);
        }
        if (inString === null) {
            nextQuoteIndex = remaining.search(quote);
            const nextInstructionSeparatorIndex = remaining.search(instructionSeparator);
            const nextSeparatorIndex = remaining.search(separators);
            nextPos = Math.min(
                remaining.length,
                nextQuoteIndex === -1 ? Number.POSITIVE_INFINITY : nextQuoteIndex,
                nextInstructionSeparatorIndex === -1 ? Number.POSITIVE_INFINITY : nextInstructionSeparatorIndex,
                nextSeparatorIndex === -1 ? Number.POSITIVE_INFINITY : nextSeparatorIndex);

            const token = remaining.substring(0, nextPos);
            if (nextPos === nextQuoteIndex) {
                // First thing after the current token is a string
                inString = "";
            }
            let nextSeparator = nextPos < remaining.length ? remaining.charAt(nextPos) : '';
            const tokenClass =
                (keywords.indexOf(token) != -1) ? "keyword" :
                numbers.test(token) ? "number" :
                hex.test(token) ? "hex" :
                "token";
            instruction += token + nextSeparator;
            if (firstToken) {
                if (tokenClass === "keyword") {
                    lastInstruction = token;
                }
                if (token === "FOR" || token === "SUB") {
                    indent++;
                }
                else if (token === "NEXT" || token === "SUBEND") {
                    indent--;
                    addIndentation(instructionEl, indent + ifDepth);
                }
                else if (token === "IF") {
                    ifDepth++;
                }
            }
            if (token === "ELSE") {
                instructionEl.className += " no-double-colon";
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent - 1 + ifDepth);
            }
            const tokenEl = el(instructionEl, tokenClass, token);
            if (tokenClass === "number" && instructionsThatCanGoto.indexOf(lastInstruction) !== -1 && lastTokenClass === "keyword") {
                tokenEl.dataset.lineRef = parseInt(token, 10);
                tokenEl.className += " line-number-reference";
            }
            firstToken = false;
            if (nextSeparator) {
                el(instructionEl, operators.test(nextSeparator) ? "operator" : "separator", nextSeparator);
            }
            if (token === "THEN" || token === "ELSE") {
                instructionEl.className += " no-double-colon";
                instructions.push(instruction);
                instruction = "";
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent + ifDepth);
                firstToken = true;
            }
            if (nextPos === nextInstructionSeparatorIndex) {
                // We're done with this instruction, start a new one
                instructions.push(instruction);
                instruction = "";
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent + ifDepth);
                firstToken = true;
                nextSeparator = remaining.match(instructionSeparator)[0];
            }
            remaining = remaining.substring(nextPos + nextSeparator.length);
            lastTokenClass = tokenClass;
        }
    } while (remaining);
    return {
        lineNumber,
        src: instructionsStr,
        instructions,
        el: lineEl,
        indent
    };
;
}

const keywords = [
    "ABS", "ACCEPT", "VALIDATE", "AT", "BEEP", "ERASE", "ALL", "SIZE", "UALPHA", "DIGIT", "NUMERIC",
    "ASC", "ATN", "BREAK", "BYE", "CALL", "CHAR", "CHARPAT", "CHARSET", "CHR$", "CLEAR", "CLOSE", "DELETE",
    "COINC", "COLOR", "CONTINUE", "CON", "COS", "DATA", "DEF", "DELSPRITE", "DIM", "DISPLAY", "USING",
    "DISTANCE", "END", "EOF", "ERR", "EXP", "FOR", "TO", "STEP", "GCHAR", "GOSUB", "GO", "SUB", "GOTO",
    "HCHAR", "IF", "THEN", "ELSE", "IMAGE", "INIT", "INPUT", "REC", "INT", "JOYST", "KEY", "LEN", "LET",
    "LINK", "LINPUT", "LIST", "LOAD", "LOCATE", "LOG", "MAGNIFY", "MAX", "MERGE", "MIN", "MOTION", "NEW",
    "NEXT", "NUMBER", "NUM", "OLD", "ON", "BREAK", "STOP", "ERROR", "WARNING", "OPEN", "OPTION", "BASE",
    "PATTERN", "PEEK", "PI", "POS", "POSITION", "PRINT", "RANDOMIZE", "REM", "RESEQUENCE", "RES",
    "RESTORE", "RETURN", "RND", "RPT$", "RUN", "SAVE", "PROTECTED", "SAY", "SCREEN", "SEG$", "SGN",
    "SIN", "SIZE", "SOUND", "SPGET", "SPRITE", "SQR", "STOP", "STR$", "SUBEND", "SUBEXIT", "TAB",
    "TAN", "TRACE", "UNBREAK", "UNTRACE", "VAL", "VCHAR", "VERSION", "AND", "APPEND", "FIXED", "INTERNAL",
    "NOT", "OR", "OUTPUT", "PERMANENT", "READ", "RELATIVE", "SEQUENTIAL", "UPDATE", "VARIABLE", "XOR"
];

const instructionsThatCanGoto = [
    "GOTO", "GO", "GOSUB", "IF", "THEN", "ELSE", "RESTORE", "ON", "BREAK", "CONTINUE", "RETURN", "RUN"
];

const instructionSeparator = /\s*::\s*/;
const separators = /[\s,;:\(\)\+\*\-\/\^&\<\>=]+/;
const quote = /\"/;
const operators = /[\+\*\-\/\^&\<\>=]+/;
const numbers = /^[-+]?([0-9]{0,10}[.])?[0-9]{1,10}([eE][-+]?\d+)?$/;
const hex = /^[\da-fA-F]{2,}$/;

document.addEventListener('DOMContentLoaded', e => {
    const prettySrc = document.getElementById("pretty-source");
    const originalSrc = document.getElementById("original-source");
    const prettyTab = document.getElementById("pretty-tab");
    const originalTab = document.getElementById("original-tab");
    const prettyRadio = document.getElementById("pretty-btn");
    const radios = document.querySelectorAll("input[type=radio]");

    let srcFileUrl = window.location.search;
    if (srcFileUrl.charAt(0) === '?') {
        srcFileUrl = srcFileUrl.substring(1);
    }
    console.log(`Loading ${srcFileUrl}...`);
    const req = new XMLHttpRequest();
    const ast = [];
    req.addEventListener("load", () => {
        console.log("Loaded");
        const src = originalSrc.innerText = req.responseText;
        prettySrc.innerHTML = "";
        let indent = 0;
        src.split(/[\r\n]+/g).forEach(line => {
            if (line) {
                const { lineNumberStr, instructionsStr } =
                    line.match(/^(?<lineNumberStr>\d+)\s+(?<instructionsStr>.*)$/).groups;
                const lineNumber = parseInt(lineNumberStr, 10);
                ast[lineNumber] = parseAndRenderLine(prettySrc, lineNumber, instructionsStr);
                indent = ast[lineNumber].indent;
            }
        });
    });
    req.responseType = "text";
    req.open("GET", srcFileUrl);
    req.send();

    radios.forEach(el => el.addEventListener("change", () => {
        if (prettyRadio.checked) {
            originalSrc.className = "source inactive-pane";
            originalTab.className = "inactive-tab";
            prettySrc.className = "source active-pane";
            prettyTab.className = "active-tab";
        } else {
            prettySrc.className = "source inactive-pane";
            prettyTab.className = "inactive-tab";
            originalSrc.className = "source active-pane";
            originalTab.className = "active-tab";
        }
    }));

    prettySrc.addEventListener("click", e => {
        if (e.target.dataset) {
            const lineRef = e.target.dataset.lineRef;
            const ref = ast[lineRef];
            if (ref && ref.el) {
                prettySrc.querySelectorAll("span.selected").forEach(el => el.className = el.className.replace(" selected", ""));
                ref.el.className += " selected";
                ref.el.scrollIntoView();
            }
        }
    });
});