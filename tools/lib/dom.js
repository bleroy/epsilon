// DOM - A dead simple helper to create DOM elements
// (c) 2022 Bertrand Le Roy

'use strict'

/** Creates a child element under an existing one.
 * @param {HTMLElement} parent The element under which to create the new element.
 * @param {string} className The CSS class for the new element.
 * @param {string} text The inner text for the new element.
 * @param {string} tag The tag name for the new element. `span` is used if this is omitted.
 * @param {Object} attr Optional attribute values.
 * @returns {HTMLElement} The new element. */
 function el(parent, className = "", text = "", tag = "span", attr = {}) {
    const el = document.createElement(tag);
    el.className = className || "";
    if (text && text.html) {
        el.innerHTML = text.html;
    } else {
        el.innerText = text;
    }
    attr = attr || {};
    for (let attrName in attr) {
        el.setAttribute(attrName, attr[attrName]);
    }
    parent.append(el);
    return el;
}

/** Indents an element by adding a 2em margin per tab stop.
 * @param {HTMLElement} el The element to indent.
 * @param {number} indent The number of indentation tab stops to apply. */
function indent(el, indent) {
    el.style.marginLeft = indent + "em";
}

/** Wraps a string into an object that tracks the fact that it really is HTML.
 * @param {string} str The string to wrap.
 * @returns {Object} An object with a single 'html' property that is the original string. */
function html(str) {
    return {
        html: str
    };
}

export { el, indent, html };