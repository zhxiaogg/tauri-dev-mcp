# Tauri Dev MCP Server - Simplified API Design

## MCP Tool Definitions

### DOM Inspection Tools

#### `inspect_element`
**Description**: Get detailed information about a specific DOM element (returns first match)

**When to use**: When you need comprehensive details about ONE specific element, including styles, attributes, and properties.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector (returns first matching element)",
      "examples": ["#submit-btn", ".login-form", "[data-testid='user-menu']"]
    },
    "include_styles": {
      "type": "boolean",
      "default": true,
      "description": "Include computed styles"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "element": {
      "type": "object",
      "properties": {
        "tagName": {"type": "string"},
        "id": {"type": "string"},
        "className": {"type": "string"},
        "textContent": {"type": "string"},
        "innerHTML": {"type": "string"},
        "attributes": {
          "type": "object",
          "additionalProperties": {"type": "string"}
        },
        "computedStyles": {
          "type": "object",
          "additionalProperties": {"type": "string"}
        },
        "boundingRect": {
          "type": "object",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"},
            "width": {"type": "number"},
            "height": {"type": "number"},
            "top": {"type": "number"},
            "right": {"type": "number"},
            "bottom": {"type": "number"},
            "left": {"type": "number"}
          }
        },
        "isVisible": {"type": "boolean"},
        "isInteractable": {"type": "boolean"}
      }
    },
    "found": {"type": "boolean"},
    "error": {"type": "string"}
  }
}
```

#### `query_selector`
**Description**: Find multiple elements matching a selector (returns array of matches)

**When to use**: When you need to find MULTIPLE elements or get a list/overview of elements. Returns basic info without detailed styles.

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector (returns all matching elements)",
      "examples": [".nav-item", "input[type='text']", "button", ".error-message"]
    },
    "limit": {
      "type": "number",
      "default": 10,
      "description": "Maximum elements to return"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "elements": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "tagName": {"type": "string"},
          "id": {"type": "string"},
          "className": {"type": "string"},
          "textContent": {"type": "string"}
        }
      }
    },
    "count": {"type": "number"}
  }
}
```

### Console Tools

#### `get_console_logs`
**Description**: Retrieve the latest N console messages from the webview (snapshot, not streaming)

**Behavior**: Returns console logs sorted by **most recent first** (newest → oldest)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "level": {
      "type": "string",
      "enum": ["log", "warn", "error", "info", "debug", "all"],
      "default": "all",
      "description": "Filter by log level"
    },
    "limit": {
      "type": "number",
      "default": 50,
      "maximum": 1000,
      "description": "Number of latest logs to return (most recent first)"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "logs": {
      "type": "array",
      "description": "Array of logs sorted by newest first",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": {
            "type": "string",
            "format": "date-time",
            "description": "ISO 8601 timestamp"
          },
          "level": {
            "type": "string",
            "enum": ["log", "warn", "error", "info", "debug"]
          },
          "message": {
            "type": "string",
            "description": "The console message"
          },
          "args": {
            "type": "array",
            "description": "Additional arguments passed to console method",
            "items": {"type": "string"}
          }
        }
      }
    },
    "total_available": {
      "type": "number",
      "description": "Total logs available in buffer"
    },
    "returned_count": {
      "type": "number",
      "description": "Number of logs returned in this response"
    },
    "has_more": {
      "type": "boolean",
      "description": "Whether more logs are available beyond the limit"
    }
  }
}
```

**Example Response**:
```json
{
  "logs": [
    {
      "timestamp": "2025-01-20T15:30:45.123Z",
      "level": "error",
      "message": "Failed to load user data",
      "args": ["Error details:", "Network timeout"]
    },
    {
      "timestamp": "2025-01-20T15:30:40.456Z",
      "level": "log",
      "message": "User clicked submit button",
      "args": []
    }
  ],
  "total_available": 150,
  "returned_count": 2,
  "has_more": true
}
```

### Automation Tools

#### `click_element`
**Description**: Perform a click action on an element

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector",
      "examples": ["#submit-btn", ".close-modal", "[data-action='save']"]
    },
    "click_type": {
      "type": "string",
      "enum": ["left", "right", "double"],
      "default": "left",
      "description": "Type of click to perform"
    },
    "wait_timeout": {
      "type": "number",
      "default": 5000,
      "description": "Wait timeout for element to be clickable (ms)"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "clicked_element": {
      "type": "object",
      "properties": {
        "tagName": {"type": "string"},
        "id": {"type": "string"},
        "className": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `input_text`
**Description**: Input text into form elements (input, textarea, contenteditable)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector",
      "examples": ["[name='username']", "#email-input", "textarea.comment"]
    },
    "text": {
      "type": "string",
      "description": "Text to input"
    },
    "clear_first": {
      "type": "boolean",
      "default": true,
      "description": "Clear existing text before typing"
    },
    "trigger_events": {
      "type": "boolean",
      "default": true,
      "description": "Trigger input/change events for validation"
    }
  },
  "required": ["selector", "text"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "input_element": {
      "type": "object",
      "properties": {
        "tagName": {"type": "string"},
        "type": {"type": "string"},
        "name": {"type": "string"},
        "value": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `scroll_to_element`
**Description**: Scroll the page to bring an element into view

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector",
      "examples": ["#footer", ".product-details", "[data-section='reviews']"]
    },
    "behavior": {
      "type": "string",
      "enum": ["smooth", "auto"],
      "default": "smooth",
      "description": "Scrolling behavior"
    },
    "block": {
      "type": "string",
      "enum": ["start", "center", "end", "nearest"],
      "default": "center",
      "description": "Vertical alignment"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "scrolled_to": {
      "type": "object",
      "properties": {
        "element": {"type": "string"},
        "final_position": {
          "type": "object",
          "properties": {
            "x": {"type": "number"},
            "y": {"type": "number"}
          }
        }
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `hover_element`
**Description**: Hover over an element to trigger hover states/menus

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector",
      "examples": [".dropdown-trigger", "#tooltip-target", ".menu-item"]
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "hovered_element": {
      "type": "object",
      "properties": {
        "tagName": {"type": "string"},
        "id": {"type": "string"},
        "className": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `select_option`
**Description**: Select an option from a dropdown/select element

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector for the select element",
      "examples": ["select[name='country']", "#language-select"]
    },
    "option": {
      "type": "string",
      "description": "Option to select (by value, text, or index)"
    },
    "by": {
      "type": "string",
      "enum": ["value", "text", "index"],
      "default": "value",
      "description": "How to identify the option"
    }
  },
  "required": ["selector", "option"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "selected_option": {
      "type": "object",
      "properties": {
        "value": {"type": "string"},
        "text": {"type": "string"},
        "index": {"type": "number"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `check_checkbox`
**Description**: Check or uncheck a checkbox/radio button

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector for checkbox/radio",
      "examples": ["[name='agree_terms']", "#newsletter-opt-in"]
    },
    "checked": {
      "type": "boolean",
      "default": true,
      "description": "Whether to check (true) or uncheck (false)"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "checkbox_state": {
      "type": "object",
      "properties": {
        "checked": {"type": "boolean"},
        "name": {"type": "string"},
        "value": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `press_key`
**Description**: Send keyboard input (Enter, Tab, Escape, etc.)

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "key": {
      "type": "string",
      "description": "Key to press (KeyboardEvent.key values)",
      "examples": ["Enter", "Tab", "Escape", "ArrowDown", "F1"]
    },
    "target_selector": {
      "type": "string",
      "description": "Optional: target element selector (focuses first)"
    },
    "modifiers": {
      "type": "array",
      "items": {
        "type": "string",
        "enum": ["ctrl", "shift", "alt", "meta"]
      },
      "default": [],
      "description": "Modifier keys to hold"
    }
  },
  "required": ["key"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "key_pressed": {
      "type": "object",
      "properties": {
        "key": {"type": "string"},
        "modifiers": {"type": "array", "items": {"type": "string"}},
        "target_element": {"type": "string"}
      }
    },
    "error": {"type": "string"}
  }
}
```

#### `wait_for_element`
**Description**: Wait for an element to appear, disappear, or change state

**Input Schema**:
```json
{
  "type": "object",
  "properties": {
    "selector": {
      "type": "string",
      "description": "CSS selector to wait for"
    },
    "condition": {
      "type": "string",
      "enum": ["visible", "hidden", "exists", "not_exists", "clickable"],
      "default": "visible",
      "description": "Condition to wait for"
    },
    "timeout": {
      "type": "number",
      "default": 10000,
      "description": "Maximum wait time in milliseconds"
    }
  },
  "required": ["selector"]
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {"type": "boolean"},
    "condition_met": {"type": "boolean"},
    "wait_time": {"type": "number"},
    "final_state": {
      "type": "object",
      "properties": {
        "exists": {"type": "boolean"},
        "visible": {"type": "boolean"},
        "clickable": {"type": "boolean"}
      }
    },
    "error": {"type": "string"}
  }
}
```


## HTTP API Endpoints (Tauri Plugin)

### Base URL Structure
```
http://localhost:3001/api/
```

### Endpoint Definitions

#### `POST /execute`
Execute any tool command
```json
{
  "tool": "inspect_element",
  "params": {
    "selector": "#my-button"
  }
}
```

Response:
```json
{
  "success": true,
  "data": { /* tool-specific response */ }
}
```

#### `GET /health`
Health check endpoint
```json
{
  "status": "healthy",
  "webview_ready": true
}
```

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ELEMENT_NOT_FOUND",
    "message": "No element found matching selector '#missing'"
  }
}
```

### Error Codes
- `ELEMENT_NOT_FOUND` - CSS selector returned no results
- `ELEMENT_NOT_INTERACTABLE` - Element not clickable/visible
- `TIMEOUT` - Operation timed out
- `INVALID_SELECTOR` - Malformed CSS selector
- `WEBVIEW_NOT_READY` - WebView not initialized

## Data Flow Implementation

### Tool Execution Flow
```typescript
// MCP Server receives tool call
async function executeTool(name: string, params: any): Promise<any> {
  // 1. Validate input
  const validatedParams = validateSchema(name, params);

  // 2. Send HTTP request to Tauri plugin
  const response = await fetch('http://localhost:3001/api/execute', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      tool: name,
      params: validatedParams
    })
  });

  // 3. Return transformed response
  return await response.json();
}
```
