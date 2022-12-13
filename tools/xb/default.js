// XB Browser - A TI-99/4A Extended Basic source code visualizer
// (c) 2022 Bertrand Le Roy

'use strict'

import { el } from "../lib/dom.js";
import { prettify } from "../lib/xb.js";

/** The relative path from this script to the root path where extended basic files should be looked for.
 * @type {string} */
const pathToRoot = "../../";

// Set-up DOM loaded event.
document.addEventListener('DOMContentLoaded', e => {
    /** The title element
     * @type {HTMLElement} */
    const titleEl = document.getElementById("title");
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
    // Get the file.
    fetch(pathToRoot + srcFileUrl).then(res => {
        titleEl.innerText = srcFileUrl;
        res.text().then(code => {
            originalSrc.innerText = code;
            prettify(prettySrc, code);
        });
    });

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
});