// Tauri Dev MCP Inspector JavaScript
// This script provides DOM inspection, console monitoring, and automation capabilities

(function() {
    'use strict';

    // Namespace for all MCP functionality
    window.__TAURI_DEV_MCP = window.__TAURI_DEV_MCP || {};
    const MCP = window.__TAURI_DEV_MCP;

    // Console log buffer
    MCP.consoleLogs = [];
    MCP.maxLogEntries = 1000;

    // Override console methods to capture logs
    const originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error,
        info: console.info,
        debug: console.debug
    };

    function captureConsole(level, originalMethod) {
        console[level] = function(...args) {
            // Call original method
            originalMethod.apply(console, args);
            
            // Capture the log
            const logEntry = {
                timestamp: new Date().toISOString(),
                level: level,
                message: args.map(arg => {
                    if (typeof arg === 'object') {
                        try {
                            return JSON.stringify(arg);
                        } catch (e) {
                            return String(arg);
                        }
                    }
                    return String(arg);
                }).join(' '),
                args: args.map(arg => String(arg))
            };
            
            MCP.consoleLogs.push(logEntry);
            
            // Keep buffer size manageable
            if (MCP.consoleLogs.length > MCP.maxLogEntries) {
                MCP.consoleLogs.shift();
            }
        };
    }

    // Set up console capture
    ['log', 'warn', 'error', 'info', 'debug'].forEach(level => {
        captureConsole(level, originalConsole[level]);
    });

    // DOM Helper Functions
    MCP.getElementDetails = function(element, includeStyles = true) {
        if (!element) return null;

        const details = {
            tagName: element.tagName,
            id: element.id || undefined,
            className: element.className || undefined,
            textContent: element.textContent?.substring(0, 1000) || undefined,
            innerHTML: element.innerHTML?.substring(0, 2000) || undefined,
        };

        // Add attributes
        const attributes = {};
        for (const attr of element.attributes || []) {
            attributes[attr.name] = attr.value;
        }
        details.attributes = attributes;

        // Add computed styles if requested
        if (includeStyles) {
            const computedStyles = {};
            const styles = window.getComputedStyle(element);
            
            // Get key styling properties
            const importantProps = [
                'display', 'visibility', 'opacity', 'position', 'top', 'left', 'right', 'bottom',
                'width', 'height', 'margin', 'padding', 'border', 'background', 'color',
                'font-family', 'font-size', 'font-weight', 'text-align', 'z-index'
            ];
            
            importantProps.forEach(prop => {
                computedStyles[prop] = styles.getPropertyValue(prop);
            });
            
            details.computedStyles = computedStyles;
        }

        // Add bounding rect
        const rect = element.getBoundingClientRect();
        details.boundingRect = {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left
        };

        // Check visibility and interactability
        details.isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
        details.isInteractable = details.isVisible && 
            !element.disabled && 
            styles.getPropertyValue('pointer-events') !== 'none';

        return details;
    };

    // Tool Implementations
    MCP.tools = {
        inspect_element: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    return {
                        element: null,
                        found: false
                    };
                }

                return {
                    element: MCP.getElementDetails(element, params.include_styles !== false),
                    found: true
                };
            } catch (error) {
                throw new Error(`Invalid selector "${params.selector}": ${error.message}`);
            }
        },

        query_selector: function(params) {
            try {
                const elements = document.querySelectorAll(params.selector);
                const limit = params.limit || 10;
                const results = [];

                for (let i = 0; i < Math.min(elements.length, limit); i++) {
                    const element = elements[i];
                    results.push({
                        tagName: element.tagName,
                        id: element.id || undefined,
                        className: element.className || undefined,
                        textContent: element.textContent?.substring(0, 200) || undefined
                    });
                }

                return {
                    elements: results,
                    count: results.length
                };
            } catch (error) {
                throw new Error(`Invalid selector "${params.selector}": ${error.message}`);
            }
        },

        get_console_logs: function(params) {
            const level = params.level || 'all';
            const limit = params.limit || 50;
            const clearAfter = params.clear_after || false;

            let filteredLogs = MCP.consoleLogs;
            
            if (level !== 'all') {
                filteredLogs = MCP.consoleLogs.filter(log => log.level === level);
            }

            // Sort by newest first
            filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            const returnedLogs = filteredLogs.slice(0, limit);

            if (clearAfter) {
                MCP.consoleLogs = [];
            }

            return {
                logs: returnedLogs,
                total_available: filteredLogs.length,
                returned_count: returnedLogs.length,
                has_more: filteredLogs.length > limit
            };
        },

        click_element: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                // Check if element is clickable
                const styles = window.getComputedStyle(element);
                const isVisible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
                const isInteractable = isVisible && 
                    !element.disabled && 
                    styles.getPropertyValue('pointer-events') !== 'none';

                if (!isInteractable) {
                    throw new Error(`Element is not interactable: ${params.selector}`);
                }

                // Perform click
                const clickType = params.click_type || 'left';
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    button: clickType === 'right' ? 2 : clickType === 'middle' ? 1 : 0,
                    detail: clickType === 'double' ? 2 : 1
                });

                element.dispatchEvent(event);

                return {
                    clicked_element: {
                        tagName: element.tagName,
                        id: element.id || undefined,
                        className: element.className || undefined
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        input_text: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                // Check if it's an input element
                const isInput = element.tagName === 'INPUT' || 
                               element.tagName === 'TEXTAREA' || 
                               element.contentEditable === 'true';

                if (!isInput) {
                    throw new Error(`Element is not a text input: ${params.selector}`);
                }

                // Clear existing text if requested
                if (params.clear_first !== false) {
                    if (element.contentEditable === 'true') {
                        element.textContent = '';
                    } else {
                        element.value = '';
                    }
                }

                // Set the text
                if (element.contentEditable === 'true') {
                    element.textContent = params.text;
                } else {
                    element.value = params.text;
                }

                // Trigger events if requested
                if (params.trigger_events !== false) {
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                }

                return {
                    input_element: {
                        tagName: element.tagName,
                        type: element.type || undefined,
                        name: element.name || undefined,
                        value: element.value || element.textContent || ''
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        scroll_to_element: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                const behavior = params.behavior || 'smooth';
                const block = params.block || 'center';

                element.scrollIntoView({
                    behavior: behavior,
                    block: block,
                    inline: 'nearest'
                });

                const rect = element.getBoundingClientRect();
                return {
                    scrolled_to: {
                        element: params.selector,
                        final_position: {
                            x: rect.x + window.scrollX,
                            y: rect.y + window.scrollY
                        }
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        hover_element: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                const event = new MouseEvent('mouseover', {
                    bubbles: true,
                    cancelable: true
                });

                element.dispatchEvent(event);

                return {
                    hovered_element: {
                        tagName: element.tagName,
                        id: element.id || undefined,
                        className: element.className || undefined
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        select_option: function(params) {
            try {
                const selectElement = document.querySelector(params.selector);
                if (!selectElement || selectElement.tagName !== 'SELECT') {
                    throw new Error(`Select element not found: ${params.selector}`);
                }

                const by = params.by || 'value';
                const option = params.option;
                let selectedOption = null;

                if (by === 'value') {
                    selectedOption = selectElement.querySelector(`option[value="${option}"]`);
                } else if (by === 'text') {
                    const options = selectElement.querySelectorAll('option');
                    for (const opt of options) {
                        if (opt.textContent.trim() === option) {
                            selectedOption = opt;
                            break;
                        }
                    }
                } else if (by === 'index') {
                    const index = parseInt(option);
                    selectedOption = selectElement.options[index];
                }

                if (!selectedOption) {
                    throw new Error(`Option not found: ${option} (by ${by})`);
                }

                selectedOption.selected = true;
                selectElement.dispatchEvent(new Event('change', { bubbles: true }));

                return {
                    selected_option: {
                        value: selectedOption.value,
                        text: selectedOption.textContent.trim(),
                        index: selectedOption.index
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        check_checkbox: function(params) {
            try {
                const element = document.querySelector(params.selector);
                if (!element) {
                    throw new Error(`Element not found: ${params.selector}`);
                }

                if (element.type !== 'checkbox' && element.type !== 'radio') {
                    throw new Error(`Element is not a checkbox or radio: ${params.selector}`);
                }

                element.checked = params.checked !== false;
                element.dispatchEvent(new Event('change', { bubbles: true }));

                return {
                    checkbox_state: {
                        checked: element.checked,
                        name: element.name || undefined,
                        value: element.value || undefined
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        press_key: function(params) {
            try {
                let targetElement = document.activeElement;
                
                if (params.target_selector) {
                    const element = document.querySelector(params.target_selector);
                    if (!element) {
                        throw new Error(`Target element not found: ${params.target_selector}`);
                    }
                    element.focus();
                    targetElement = element;
                }

                const event = new KeyboardEvent('keydown', {
                    key: params.key,
                    bubbles: true,
                    cancelable: true,
                    ctrlKey: params.modifiers?.includes('ctrl') || false,
                    shiftKey: params.modifiers?.includes('shift') || false,
                    altKey: params.modifiers?.includes('alt') || false,
                    metaKey: params.modifiers?.includes('meta') || false
                });

                targetElement.dispatchEvent(event);

                return {
                    key_pressed: {
                        key: params.key,
                        modifiers: params.modifiers || [],
                        target_element: params.target_selector
                    }
                };
            } catch (error) {
                throw new Error(error.message);
            }
        },

        wait_for_element: function(params) {
            return new Promise((resolve, reject) => {
                const selector = params.selector;
                const condition = params.condition || 'visible';
                const timeout = params.timeout || 10000;
                
                const startTime = Date.now();

                function checkCondition() {
                    try {
                        const element = document.querySelector(selector);
                        const exists = !!element;
                        let visible = false;
                        let clickable = false;

                        if (element) {
                            visible = !!(element.offsetWidth || element.offsetHeight || element.getClientRects().length);
                            const styles = window.getComputedStyle(element);
                            clickable = visible && 
                                !element.disabled && 
                                styles.getPropertyValue('pointer-events') !== 'none';
                        }

                        let conditionMet = false;
                        switch (condition) {
                            case 'exists':
                                conditionMet = exists;
                                break;
                            case 'not_exists':
                                conditionMet = !exists;
                                break;
                            case 'visible':
                                conditionMet = visible;
                                break;
                            case 'hidden':
                                conditionMet = exists && !visible;
                                break;
                            case 'clickable':
                                conditionMet = clickable;
                                break;
                        }

                        if (conditionMet) {
                            resolve({
                                condition_met: true,
                                wait_time: Date.now() - startTime,
                                final_state: {
                                    exists,
                                    visible,
                                    clickable
                                }
                            });
                            return;
                        }

                        if (Date.now() - startTime >= timeout) {
                            resolve({
                                condition_met: false,
                                wait_time: Date.now() - startTime,
                                final_state: {
                                    exists,
                                    visible,
                                    clickable
                                }
                            });
                            return;
                        }

                        setTimeout(checkCondition, 100);
                    } catch (error) {
                        reject(new Error(error.message));
                    }
                }

                checkCondition();
            });
        }
    };

    // Expose execute function
    MCP.execute = async function(tool, params) {
        if (!MCP.tools[tool]) {
            throw new Error(`Unknown tool: ${tool}`);
        }

        try {
            const result = await MCP.tools[tool](params);
            return result;
        } catch (error) {
            throw error;
        }
    };

    console.log('Tauri Dev MCP Inspector initialized');
})();