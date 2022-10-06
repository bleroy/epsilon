// XB Browser - A TI-99/4A Extended Basic source code visualizer
// (c) 2022 Bertrand Le Roy

'use strict'

/** The relative path from this script to the root path where extended basic files should be looked for.
 * @type {string} */
const pathToRoot = "../../";

/** Creates a child element under an existing one.
 * @param {HTMLElement} parent The element under which to create the new element.
 * @param {string} className The CSS class for the new element.
 * @param {string} text The inner text for the new element.
 * @param {string} tag The tag name for the new element. `span` is used if this is omitted.
 * @param {Object} attr Optional attribute values.
 * @returns {HTMLElement} The new element. */
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

/** Indents an element by adding a 2em margin per tab stop.
 * @param {HTMLElement} el The element to indent.
 * @param {number} indent The number of indentation tab stops to apply. */
function addIndentation(el, indent) {
    el.style.marginLeft = (indent * 2) + "em";
}

/**
 * @typedef {Object} LineOfCode
 * @property {number} lineNumber The line number.
 * @property {string} src The source code for the line of code. 
 * @property {string[]} instructions The source code for the separate instructions contained in the line of code.
 * @property {HTMLElement} el A reference to the HTML element representation for the line of code.
 * @property {number} indent The level of indentation after the last instruction of the line of code. */


/** Parses and renders a line of Extended Basic code.
 * This is obviously not how you build a proper parser.
 * The idea here is to make the code more readable, not to understand it so it'll do.
 * @param {HTMLElement} pane The element to which to append the prettified line of code.
 * @param {number} lineNumber The line number.
 * @param {string} instructionsStr The line of code.
 * @param {number} indent The current indentation level at the beginning of the line of code.
 * @returns {LineOfCode} A representation of the parsed line of code. */
function parseAndRenderLine(pane, lineNumber, instructionsStr, indent = 0) {
    const lineEl = el(pane, "line");
    el(lineEl, "line-number", lineNumber);
    const instructionsEl = el(lineEl, "instructions");
    
    /** Whether we are within a string constant. Null if not, the string so far otherwise.
     * @type {string} */
    let inString = null;
    /** The next position (after token and separator) in the remaing string to parse.
     * @type {number} */
    let nextPos = 0;
    /** The part of the line of code that remains to be parsed.
     * @type {string} */
    let remaining = instructionsStr;
    /** The current nesting of `if` statements.
     * @type {number} */
    let ifDepth = 0;
    /** A flag to handle ON GOTO and ON GOSUB
     * @type {Boolean} */
    let inListOfLineNumbers = false;
    /** The element surrounding the current instruction's rendering.
     * @type {HTMLElement} */
    let instructionEl = el(instructionsEl, "instruction");
    addIndentation(instructionEl, indent);
    /** Is the current token the first on in the current instruction?
     * @type {Boolean} */
    let firstToken = true;
    /** The list of instructions (in source form) so far on this line.
     * @type {string[]} */
    const instructions = [];
    /** The source code so far for the current instruction.
     * @type {string} */
    let instruction = "";
    /** The last instruction token found.
     * @type {string} */
    let lastInstruction = "";
    /** The last token found.
     * @type {string} */
    let lastToken = "";

    do {
        /** Index of the next quote in the remaining text for the line.
         * @type {number} */
        let nextQuoteIndex;
        if (inString !== null) {
            // We're in a string until the next single double quote.
            nextQuoteIndex = remaining.search(quote);
            if (nextQuoteIndex == -1) {
                // This is a syntax error, just cut things short by pretending the line ends with a closing quote.
                nextQuoteIndex = remaining.length - 1;
            }
            // Append the new segment to the current string
            inString += remaining.substring(0, nextQuoteIndex + 1);
            if (nextQuoteIndex < remaining.length - 1 && remaining.charAt(nextQuoteIndex + 1).search(quote) === 0) {
                // This is a double quote, we're still in the string.
                inString += '"';
                nextQuoteIndex++;
            } else {
                // That string is closing
                inString = inString.substring(0, inString.length - 1);
                el(instructionEl, hex.test(inString) ? "hex" : "string", inString);
                el(instructionEl, "separator", '"');
                inString = null;
            }
            // Truncate the remaining string as we consume bits of it.
            remaining = remaining.substring(nextQuoteIndex + 1);
        }
        if (inString === null) {
            // We're not in a string, so let's find the next token,
            // that ends with a separator (instruction separator `::` or other),
            // a quote or the end of the line, whichever comes first.
            nextQuoteIndex = remaining.search(quote);
            const nextInstructionSeparatorIndex = remaining.search(instructionSeparator);
            const nextSeparatorIndex = remaining.search(separators);
            nextPos = Math.min(
                remaining.length,
                nextQuoteIndex === -1 ? Number.POSITIVE_INFINITY : nextQuoteIndex,
                nextInstructionSeparatorIndex === -1 ? Number.POSITIVE_INFINITY : nextInstructionSeparatorIndex,
                nextSeparatorIndex === -1 ? Number.POSITIVE_INFINITY : nextSeparatorIndex);

            // Get the new token and separator (empty string if we reached the end of the line).
            const token = remaining.substring(0, nextPos);
            let separator = nextPos < remaining.length ? remaining.charAt(nextPos) : '';

            // Update the current instruction.
            instruction += token + separator;

            // What kind of token is this?
            const tokenClass =
                (keywords.indexOf(token) != -1) ? "keyword" :
                // If it's after a CALL or a SUB and not a keyword, it's a sub name token and can't be a number or hex.
                lastToken === "CALL" || lastToken === "SUB" ? "token" :
                numbers.test(token) ? "number" :
                hex.test(token) ? "hex" :
                "token";

            if (firstToken) {
                // An instruction token is the first known keyword found in an instruction.
                if (tokenClass === "keyword") {
                    lastInstruction = token;
                }
                // FOR and SUB should increase indentation of subsequent instructions.
                if (token === "FOR" || token === "SUB") {
                    indent++;
                }
                // NEXT and SUBEND decrease indentation.
                else if (token === "NEXT" || token === "SUBEND") {
                    indent--;
                    addIndentation(instructionEl, indent + ifDepth);
                }
                // IF instructions have their own depth counter because they end with the line
                // whereas loops and subprograms can span multiple lines.
                else if (token === "IF") {
                    ifDepth++;
                }
            }
            // If we find an ELSE, we want to push the instruction so far and put the ELSE
            // on a separate line (as opposed to THEN, that we keep on the same line as the IF),
            // so suppress the :: and start a new line with the current indentation minus 1.
            if (token === "ELSE") {
                instructionEl.className += " no-double-colon";
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent - 1 + ifDepth);
            }
            // Render the current token.
            const tokenEl = el(instructionEl, tokenClass, token);
            // Detect ON GOTO and ON GOSUB
            if (lastInstruction === "ON" && (token === "GOSUB" || token === "GOTO")) {
                inListOfLineNumbers = true;
            }
            // If this is a line number reference, render it as such and mark the element for event handlers to pick up later.
            if (tokenClass === "number" &&
                ((instructionsThatCanGoto.indexOf(lastInstruction) !== -1 &&
                    instructionsThatCanGoto.indexOf(lastToken) !== -1) ||
                inListOfLineNumbers)) {
                tokenEl.dataset.lineRef = parseInt(token, 10);
                tokenEl.className += " line-number-reference";
            }
            // We can assume for now the next token is not going to be the first in a new instruction.
            firstToken = false;
            // Render the separator.
            if (separator) {
                el(instructionEl, operators.test(separator) ? "operator" : "separator", separator);
            }
            // If we just rendered THEN or ELSE, the next token should be on a new line (no ::)
            // with incremented indentation and be a new instruction.
            if (token === "THEN" || token === "ELSE") {
                instructionEl.className += " no-double-colon";
                instructions.push(instruction);
                instruction = "";
                lastInstruction = token;
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent + ifDepth);
                firstToken = true;
                inListOfLineNumbers = false;
            }
            // If this is a subroutine definition, store its name on the element for events to use.
            if (lastInstruction === "SUB" && lastToken === "SUB") {
                lineEl.dataset.sub = token;
            }
            // If this is a CALL to a user subroutine, mark it as a reference and store the name
            // of the subroutine for events to use.
            if (lastToken === "CALL" && tokenClass === "token") {
                tokenEl.dataset.subRef = token;
                tokenEl.className = "token sub-reference"
            }
            // If we're done with this instruction, start a new one at the current indentation.
            if (nextPos === nextInstructionSeparatorIndex) {
                instructions.push(instruction);
                instruction = "";
                instructionEl = el(instructionsEl, "instruction");
                addIndentation(instructionEl, indent + ifDepth);
                firstToken = true;
                inListOfLineNumbers = false;
                separator = remaining.match(instructionSeparator)[0];
            }
            // Debugging data, uncomment if needed:
            tokenEl.dataset.lastInstruction = lastInstruction;
            tokenEl.dataset.lastToken = lastToken;
            tokenEl.dataset.indent = indent;
            tokenEl.dataset.ifDepth = ifDepth;

            // Are we entering a string after this token?
            if (nextPos === nextQuoteIndex) {
                inString = "";
            }
            // Advance to the next token
            remaining = remaining.substring(nextPos + separator.length);
            lastToken = token;
        }
    } while (remaining);
    // Finally, return a structure representing the parsed and rendered line of code.
    return {
        lineNumber,
        src: instructionsStr,
        instructions,
        el: lineEl,
        indent
    };
;
}

/** The list of known Extended Basic keywords.
 * @type {string[]} */
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

/** Instructions that can be followed with a line number.
 * @type {string[]} */
const instructionsThatCanGoto = [
    "GOTO", "GO", "GOSUB", "IF", "THEN", "ELSE", "RESTORE", "ON", "BREAK", "ERROR", "CONTINUE", "RETURN", "RUN"
];

/** Expression that finds instruction separators.
 * @type {RegExp} */
const instructionSeparator = /\s*::\s*/;
/** Expression that finds separator characters.
 * @type {RegExp} */
const separators = /[\s,;:\(\)\+\*\-\/\^&\<\>=]+/;
/** Expression that finds string delimiters.
 * @type {RegExp} */
const quote = /\"/;
/** Expression that finds operators.
 * @type {RegExp} */
const operators = /[\+\*\-\/\^&\<\>=]+/;
/** Expression that recognizes decimal numbers.
 * @type {RegExp} */
const numbers = /^[-+]?([0-9]{0,10}[.])?[0-9]{1,10}([eE][-+]?\d+)?$/;
/** Expression that recognizes hexadecimal numbers.
 * @type {RegExp} */
const hex = /^[\da-fA-F]{2,}$/;
/** Expression that finds named groups for the line number and code from a raw line of code.
 * @type {RegExp} */
 const lineNumberAndCode = /^(?<lineNumberStr>\d+)\s+(?<instructionsStr>.*)$/;

// Set-up DOM loaded event.
document.addEventListener('DOMContentLoaded', e => {
    /** The element where we'll render the prettified source code.
     * @type {HTMLElement} */
    const prettySrc = document.getElementById("pretty-source");
    /** The element where we'll render the original unformatted source code.
     * @type {HTMLElement} */
    const originalSrc = document.getElementById("original-source");
    /** The prettified source code tab element.
     * @type {HTMLElement} */
    const prettyTab = document.getElementById("pretty-tab");
    /** The original source code tab element.
     * @type {HTMLElement} */
    const originalTab = document.getElementById("original-tab");
    /** The radio button for the source code tab.
     * @type {HTMLElement} */
    const prettyRadio = document.getElementById("pretty-btn");
    /** The radio buttons that switch between tabs.
     * @type {HTMLElement} */
    const radios = document.querySelectorAll("input[type=radio]");
    /** The popup element where to render hex string representations.
     * @type {HTMLElement} */
    const hexView = document.getElementById("hex-view");
    /** The parsed and rendered source code.
     * @type {LineOfCode[]} */
    const ast = [];

    /** The URL of the source file to render.
     * @type {string} */
    let srcFileUrl = window.location.search;
    // Reject attempts to go up the file system.
    if (srcFileUrl.indexOf("..") !== -1) {
        console.error("File path contains \"..\". Exiting...");
        return;
    }
    // Remove the leading '?'.
    if (srcFileUrl.charAt(0) === '?') {
        srcFileUrl = srcFileUrl.substring(1);
    }
    // Prefix with the path to the root from here.
    srcFileUrl = pathToRoot + srcFileUrl;
    // Get the file.
    const req = new XMLHttpRequest();
    req.addEventListener("load", () => {
        const src = originalSrc.innerText = req.responseText;
        prettySrc.innerHTML = "";
        let indent = 0;
        // Parse each line.
        src.split(/[\r\n]+/g).forEach(line => {
            if (line) {
                // Separate line number from code.
                const { lineNumberStr, instructionsStr } = line.match(lineNumberAndCode).groups;
                // Parse the line number as an integer.
                const lineNumber = parseInt(lineNumberStr, 10);
                // Parse and render the line of code.
                ast[lineNumber] = parseAndRenderLine(prettySrc, lineNumber, instructionsStr, indent);
                // Set the current indentation as the one after parsing the line of code.
                indent = ast[lineNumber].indent;
            }
        });
    });
    req.responseType = "text";
    req.open("GET", srcFileUrl);
    req.send();

    // Wire up events for tab switching.
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

    // Wire up click events to bubble up to the pretty source container.
    prettySrc.addEventListener("click", e => {
        // Reset selections for hex strings and lines.
        prettySrc.querySelectorAll(".hex.selected").forEach(el => el.className = el.className.replace(" selected", ""));
        prettySrc.querySelectorAll("span.line.selected").forEach(el => el.className = el.className.replace(" selected", ""));
        // If the clicked element is for a token that points to a line number
        // or a named subroutine, select that and bring it into view.
        if (e.target.dataset) {
            const lineRef = e.target.dataset.lineRef;
            const subRef = e.target.dataset.subRef;
            // Find the line being pointed to.
            const ref = lineRef ? ast[lineRef] : subRef ? { el: prettySrc.querySelectorAll(`[data-sub=\"${subRef}\"]`)[0]} : null;
            // If found, select and bring into view.
            if (ref && ref.el) {
                ref.el.className += " selected";
                ref.el.scrollIntoView();
            }
        }
        // If the clicked element is a hex string, display its representation in a popup.
        if (e.target.className.indexOf("hex") !== -1) {
            // Select the hex string.
            e.target.className += " selected";
            // Get the hex string.
            let hex = e.target.innerText;
            // If this is already rendered, do nothing.
            if (hexView.dataset.hex === hex) return;
            // Clear the popup.
            hexView.innerHTML = "";
            // Add a trailing 0 if we there's a lone nibble (a half-byte).
            if (hex.length % 2) hex = hex + "0";
            // Add a body to the container table.
            let tbody = el(hexView, "", "", "tbody");
            // Loop over bytes
            for (let i = 0; i < hex.length / 2; i++) {
                /** A row for the current byte.
                 * @type {HTMLElement} */
                let lineEl = el(tbody, "line", "", "tr");
                /** The string representation of the current byte.
                 * @type {string} */
                let byteStr = hex.substring(i * 2, i * 2 + 2);
                /** The current byte.
                 * @type {number} */
                let byte = parseInt(byteStr, 16);
                /** The binary representation of the current byte.
                 * @type {string} */
                let binary = byte.toString(2).padStart(8, '0');
                // Create a cell for each bit.
                for (let b = 0; b < 8; b++) {
                    el(lineEl, binary.charAt(b) === '0' ? "bit" : "bit on", "", "td");
                }
                // Add the hex representation of the byte.
                el(lineEl, "byte", "0&" + byteStr, "td");
                // Add the decimal representation of the byte.
                el(lineEl, "decimal", byte, "td");
            }
            // Keep track of the current hex string being represented.
            hexView.dataset.hex = hex;
            // Position the popup next to the mouse pointer.
            hexView.style.top = (e.pageY + 8) + "px";
            hexView.style.left = (e.pageX + 4) + "px";
            hexView.style.visibility = "visible";
        } else {
            // Hide the popup if something else than a hex string was clicked.
            hexView.dataset.hex = null;
            hexView.style.visibility = "hidden";
        }
    });

    // Wire up hover for line numbers and subroutine references to highlight the target line.
    prettySrc.addEventListener("mouseover", e => {
        // Remove the previous highlight.
        prettySrc.querySelectorAll("span.line.hovered").forEach(el => el.className = el.className.replace(" hovered", ""));
        if (e.target.dataset) {
            // Is the element being hovered pointing to a line or subroutine?
            const lineRef = e.target.dataset.lineRef;
            const subRef = e.target.dataset.subRef;
            // Find the line being pointed to.
            const ref = lineRef ? ast[lineRef] : subRef ? { el: prettySrc.querySelectorAll(`[data-sub=\"${subRef}\"]`)[0]} : null;
            // Highlight the line pointed to.
            if (ref && ref.el) {
                ref.el.className += " hovered";
            }
        }
    });
});