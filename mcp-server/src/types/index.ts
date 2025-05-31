import { z } from 'zod';

// Base schemas for tool responses
export const BaseResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

// DOM Element schema
export const ElementSchema = z.object({
  tagName: z.string(),
  id: z.string().optional(),
  className: z.string().optional(),
  textContent: z.string().optional(),
  innerHTML: z.string().optional(),
  attributes: z.record(z.string()).optional(),
  computedStyles: z.record(z.string()).optional(),
  boundingRect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  }).optional(),
  isVisible: z.boolean().optional(),
  isInteractable: z.boolean().optional(),
});

// DOM Tools
export const InspectElementInputSchema = z.object({
  selector: z.string().describe('CSS selector (returns first matching element)'),
  include_styles: z.boolean().default(true).describe('Include computed styles'),
});

export const InspectElementOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    element: ElementSchema,
    found: z.boolean(),
  }).optional(),
});

export const QuerySelectorInputSchema = z.object({
  selector: z.string().describe('CSS selector (returns all matching elements)'),
  limit: z.number().default(10).describe('Maximum elements to return'),
});

export const QuerySelectorOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    elements: z.array(ElementSchema.pick({
      tagName: true,
      id: true,
      className: true,
      textContent: true,
    })),
    count: z.number(),
  }).optional(),
});

// Console Tools
export const GetConsoleLogsInputSchema = z.object({
  level: z.enum(['log', 'warn', 'error', 'info', 'debug', 'all']).default('all').describe('Filter by log level'),
  limit: z.number().default(50).describe('Number of latest logs to return (most recent first)').refine(val => val <= 1000, { message: 'Limit must be 1000 or less' }),
  clear_after: z.boolean().default(false).describe('Clear the console buffer after retrieving logs'),
});

export const ConsoleLogSchema = z.object({
  timestamp: z.string().describe('ISO 8601 timestamp'),
  level: z.enum(['log', 'warn', 'error', 'info', 'debug']),
  message: z.string().describe('The console message'),
  args: z.array(z.string()).describe('Additional arguments passed to console method'),
});

export const GetConsoleLogsOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    logs: z.array(ConsoleLogSchema).describe('Array of logs sorted by newest first'),
    total_available: z.number().describe('Total logs available in buffer'),
    returned_count: z.number().describe('Number of logs returned in this response'),
    has_more: z.boolean().describe('Whether more logs are available beyond the limit'),
  }).optional(),
});

// Automation Tools
export const ClickElementInputSchema = z.object({
  selector: z.string().describe('CSS selector'),
  click_type: z.enum(['left', 'right', 'double']).default('left').describe('Type of click to perform'),
  wait_timeout: z.number().default(5000).describe('Wait timeout for element to be clickable (ms)'),
});

export const ClickElementOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    clicked_element: ElementSchema.pick({
      tagName: true,
      id: true,
      className: true,
    }),
  }).optional(),
});

export const InputTextInputSchema = z.object({
  selector: z.string().describe('CSS selector'),
  text: z.string().describe('Text to input'),
  clear_first: z.boolean().default(true).describe('Clear existing text before typing'),
  trigger_events: z.boolean().default(true).describe('Trigger input/change events for validation'),
});

export const InputTextOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    input_element: z.object({
      tagName: z.string(),
      type: z.string().optional(),
      name: z.string().optional(),
      value: z.string(),
    }),
  }).optional(),
});

export const ScrollToElementInputSchema = z.object({
  selector: z.string().describe('CSS selector'),
  behavior: z.enum(['smooth', 'auto']).default('smooth').describe('Scrolling behavior'),
  block: z.enum(['start', 'center', 'end', 'nearest']).default('center').describe('Vertical alignment'),
});

export const ScrollToElementOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    scrolled_to: z.object({
      element: z.string(),
      final_position: z.object({
        x: z.number(),
        y: z.number(),
      }),
    }),
  }).optional(),
});

export const HoverElementInputSchema = z.object({
  selector: z.string().describe('CSS selector'),
});

export const HoverElementOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    hovered_element: ElementSchema.pick({
      tagName: true,
      id: true,
      className: true,
    }),
  }).optional(),
});

export const SelectOptionInputSchema = z.object({
  selector: z.string().describe('CSS selector for the select element'),
  option: z.string().describe('Option to select (by value, text, or index)'),
  by: z.enum(['value', 'text', 'index']).default('value').describe('How to identify the option'),
});

export const SelectOptionOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    selected_option: z.object({
      value: z.string(),
      text: z.string(),
      index: z.number(),
    }),
  }).optional(),
});

export const CheckCheckboxInputSchema = z.object({
  selector: z.string().describe('CSS selector for checkbox/radio'),
  checked: z.boolean().default(true).describe('Whether to check (true) or uncheck (false)'),
});

export const CheckCheckboxOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    checkbox_state: z.object({
      checked: z.boolean(),
      name: z.string().optional(),
      value: z.string().optional(),
    }),
  }).optional(),
});

export const PressKeyInputSchema = z.object({
  key: z.string().describe('Key to press (KeyboardEvent.key values)'),
  target_selector: z.string().optional().describe('Optional: target element selector (focuses first)'),
  modifiers: z.array(z.enum(['ctrl', 'shift', 'alt', 'meta'])).default([]).describe('Modifier keys to hold'),
});

export const PressKeyOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    key_pressed: z.object({
      key: z.string(),
      modifiers: z.array(z.string()),
      target_element: z.string().optional(),
    }),
  }).optional(),
});

export const WaitForElementInputSchema = z.object({
  selector: z.string().describe('CSS selector to wait for'),
  condition: z.enum(['visible', 'hidden', 'exists', 'not_exists', 'clickable']).default('visible').describe('Condition to wait for'),
  timeout: z.number().default(10000).describe('Maximum wait time in milliseconds'),
});

export const WaitForElementOutputSchema = BaseResponseSchema.extend({
  data: z.object({
    condition_met: z.boolean(),
    wait_time: z.number(),
    final_state: z.object({
      exists: z.boolean(),
      visible: z.boolean(),
      clickable: z.boolean(),
    }),
  }).optional(),
});

// Tauri Command Invocation
export const TauriInvokeInputSchema = z.object({
  command: z.string().describe('Tauri command name to invoke'),
  args: z.record(z.any()).default({}).describe('Arguments to pass to the Tauri command'),
});

export const TauriInvokeOutputSchema = BaseResponseSchema.extend({
  data: z.any().optional().describe('Result returned by the Tauri command'),
});

// Type exports
export type InspectElementInput = z.infer<typeof InspectElementInputSchema>;
export type InspectElementOutput = z.infer<typeof InspectElementOutputSchema>;
export type QuerySelectorInput = z.infer<typeof QuerySelectorInputSchema>;
export type QuerySelectorOutput = z.infer<typeof QuerySelectorOutputSchema>;
export type GetConsoleLogsInput = z.infer<typeof GetConsoleLogsInputSchema>;
export type GetConsoleLogsOutput = z.infer<typeof GetConsoleLogsOutputSchema>;
export type ClickElementInput = z.infer<typeof ClickElementInputSchema>;
export type ClickElementOutput = z.infer<typeof ClickElementOutputSchema>;
export type InputTextInput = z.infer<typeof InputTextInputSchema>;
export type InputTextOutput = z.infer<typeof InputTextOutputSchema>;
export type ScrollToElementInput = z.infer<typeof ScrollToElementInputSchema>;
export type ScrollToElementOutput = z.infer<typeof ScrollToElementOutputSchema>;
export type HoverElementInput = z.infer<typeof HoverElementInputSchema>;
export type HoverElementOutput = z.infer<typeof HoverElementOutputSchema>;
export type SelectOptionInput = z.infer<typeof SelectOptionInputSchema>;
export type SelectOptionOutput = z.infer<typeof SelectOptionOutputSchema>;
export type CheckCheckboxInput = z.infer<typeof CheckCheckboxInputSchema>;
export type CheckCheckboxOutput = z.infer<typeof CheckCheckboxOutputSchema>;
export type PressKeyInput = z.infer<typeof PressKeyInputSchema>;
export type PressKeyOutput = z.infer<typeof PressKeyOutputSchema>;
export type WaitForElementInput = z.infer<typeof WaitForElementInputSchema>;
export type WaitForElementOutput = z.infer<typeof WaitForElementOutputSchema>;
export type TauriInvokeInput = z.infer<typeof TauriInvokeInputSchema>;
export type TauriInvokeOutput = z.infer<typeof TauriInvokeOutputSchema>;

// HTTP API Response type
export interface TauriApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}