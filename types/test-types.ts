// TypeScript types for integration tests

import { ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

// Test configuration
export interface TestConfig {
  tauriAppTimeout: number;
  mcpServerTimeout: number;
  baseUrl: string;
  mcpServerPath: string;
  exampleAppPath: string;
}

// Test process management
export interface TestProcesses {
  tauriProcess: ChildProcess | null;
  mcpClient: Client | null;
}

// Tool test result
export interface ToolTestResult {
  toolName: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

// Test suite result
export interface TestSuiteResult {
  suiteName: string;
  tests: ToolTestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

// Overall test report
export interface IntegrationTestReport {
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    duration: number;
  };
  suites: TestSuiteResult[];
}

// MCP Tool Response Types
export interface McpResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

// DOM Element Types (from our tools)
export interface DomElement {
  tagName: string;
  id?: string;
  className?: string;
  innerHTML?: string;
  attributes?: Record<string, string>;
  computedStyles?: Record<string, string>;
  boundingRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  isVisible?: boolean;
  isInteractable?: boolean;
}

export interface InspectElementResult {
  element: DomElement | null;
  found: boolean;
}

export interface QuerySelectorResult {
  elements: Array<{
    tagName: string;
    id?: string;
    className?: string;
    attributes?: Record<string, string>;
    text?: string;
    innerText?: string;
    href?: string;
    src?: string;
    alt?: string;
    name?: string;
    type?: string;
    value?: string;
    placeholder?: string;
  }>;
  count: number;
  total_found: number;
}

export interface ConsoleLog {
  timestamp: string;
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
}

export interface ConsoleLogsResult {
  logs: ConsoleLog[];
  total_available: number;
  returned_count: number;
  has_more: boolean;
}

export interface ClickElementResult {
  clicked_element: {
    tagName: string;
    id?: string;
    className?: string;
  };
}

export interface InputTextResult {
  input_element: {
    tagName: string;
    type?: string;
    name?: string;
    value: string;
  };
}

export interface ScrollResult {
  scrolled_to: {
    element: string;
    final_position: {
      x: number;
      y: number;
    };
  };
}

export interface HoverResult {
  hovered_element: {
    tagName: string;
    id?: string;
    className?: string;
  };
}

export interface CheckboxResult {
  checkbox_state: {
    checked: boolean;
    name?: string;
    value?: string;
  };
}

export interface SelectOptionResult {
  selected_option: {
    value: string;
    text: string;
    index: number;
  };
}

export interface KeyPressResult {
  key_pressed: {
    key: string;
    modifiers: string[];
    target_element?: string;
  };
}

export interface WaitForElementResult {
  condition_met: boolean;
  wait_time: number;
  final_state: {
    exists: boolean;
    visible: boolean;
    clickable: boolean;
  };
}

export interface TauriInvokeResult {
  // Tauri commands can return any JSON-serializable data
  [key: string]: any;
}