# CSS Selectors Guide

## What are CSS Selectors?

CSS selectors are patterns used to select DOM elements in a web page. They're the same selectors used in CSS stylesheets and JavaScript's `querySelector()` methods.

## Supported Selector Types

### 1. Element/Tag Selectors
Select elements by their HTML tag name:
```css
div           /* All <div> elements */
button        /* All <button> elements */
input         /* All <input> elements */
span          /* All <span> elements */
```

### 2. ID Selectors
Select elements by their `id` attribute (unique):
```css
#my-button    /* <button id="my-button"> */
#header       /* <div id="header"> */
#login-form   /* <form id="login-form"> */
```

### 3. Class Selectors
Select elements by their `class` attribute:
```css
.btn          /* <button class="btn"> */
.nav-item     /* <li class="nav-item"> */
.error-msg    /* <span class="error-msg"> */
.btn.primary  /* <button class="btn primary"> (both classes) */
```

### 4. Attribute Selectors
Select elements by any attribute:
```css
[type="email"]           /* <input type="email"> */
[data-id="123"]          /* <div data-id="123"> */
[aria-label="Close"]     /* Elements with aria-label="Close" */
[disabled]               /* Elements with disabled attribute */
[class*="btn"]           /* Elements where class contains "btn" */
[href^="https"]          /* Links starting with https */
[src$=".png"]            /* Images ending with .png */
```

### 5. Descendant/Child Selectors
Select elements based on their relationship:
```css
.container button        /* Buttons inside .container (any depth) */
form > input             /* Direct child inputs of form */
.nav li                  /* List items inside .nav */
#sidebar .menu-item      /* .menu-item inside #sidebar */
```

### 6. Pseudo-selectors
Select elements based on their state:
```css
button:hover             /* Button being hovered */
input:focus              /* Focused input */
li:first-child           /* First li in its parent */
div:nth-child(2)         /* Second div child */
input:checked            /* Checked checkboxes/radios */
option:selected          /* Selected option */
```

### 7. Multiple Selectors
Select multiple different elements:
```css
button, input, select    /* All buttons, inputs, and selects */
.btn, .link             /* Elements with .btn OR .link class */
```

## Common Examples for Web Applications

### Forms
```css
/* Form elements */
form                     /* The form itself */
input[type="text"]       /* Text inputs */
input[type="password"]   /* Password inputs */
input[type="email"]      /* Email inputs */
select                   /* Dropdown selects */
textarea                 /* Text areas */
button[type="submit"]    /* Submit buttons */

/* Form validation */
.error                   /* Error messages */
input:invalid            /* Invalid inputs */
input:required           /* Required fields */
```

### Navigation
```css
/* Navigation elements */
.navbar                  /* Navigation bar */
.nav-menu                /* Navigation menu */
.nav-item                /* Navigation items */
.dropdown                /* Dropdown menus */
.breadcrumb              /* Breadcrumb navigation */
```

### UI Components
```css
/* Common UI patterns */
.modal                   /* Modal dialogs */
.tooltip                 /* Tooltips */
.alert                   /* Alert messages */
.card                    /* Card components */
.sidebar                 /* Sidebars */
.header                  /* Page headers */
.footer                  /* Page footers */
```

### Data Attributes
```css
/* Custom data attributes */
[data-testid="login-btn"]      /* Test automation */
[data-action="submit"]         /* Action triggers */
[data-component="slider"]      /* Component identification */
[data-state="active"]          /* State tracking */
```

## Advanced Selectors

### Combining Multiple Conditions
```css
button.btn.primary              /* Button with both btn and primary classes */
input[type="text"][required]    /* Required text inputs */
.container .btn:not(.disabled)  /* Enabled buttons in container */
```

### Position-based Selection
```css
li:first-child                  /* First item */
li:last-child                   /* Last item */
li:nth-child(odd)               /* Odd-numbered items */
li:nth-child(3)                 /* Third item */
tr:nth-of-type(even)            /* Even table rows */
```

### Content-based Selection
```css
a[href*="github"]               /* Links containing "github" */
div:contains("Error")           /* Divs containing "Error" text */
input:placeholder-shown         /* Inputs showing placeholder */
```

## Selector Specificity and Best Practices

### Recommended Order of Preference
1. **ID selectors** - Most specific, fastest: `#login-button`
2. **Data attributes** - Good for testing: `[data-testid="submit"]`
3. **Class selectors** - Balanced: `.submit-btn`
4. **Attribute selectors** - Functional: `[type="submit"]`
5. **Tag selectors** - Least specific: `button`

### Tips for Reliable Selectors
- **Use stable attributes**: Prefer `id`, `data-*`, or semantic classes
- **Avoid brittle selectors**: Don't rely on deep nesting or positioning
- **Be specific enough**: Balance between too generic and too specific
- **Use semantic selectors**: Choose selectors that reflect meaning, not styling

### Examples of Good vs Bad Selectors

**Good (Stable):**
```css
#submit-form
[data-testid="user-profile"]
.login-button
button[type="submit"]
input[name="email"]
```

**Avoid (Brittle):**
```css
div > div > button:nth-child(3)    /* Too dependent on structure */
.red-button                        /* Based on styling, not function */
body > main > section:first        /* Too much nesting */
```

## Tool Usage Context

### For `inspect_element`
Use specific selectors to get detailed information about one element:
```css
#main-nav-button
.user-profile-dropdown
[data-testid="checkout-btn"]
```

### For `query_selector`
Use broader selectors to find multiple related elements:
```css
.nav-item              /* All navigation items */
input[type="text"]     /* All text inputs */
.error-message         /* All error messages */
```

### For Automation (`click_element`, `input_text`)
Use precise, stable selectors:
```css
#login-submit          /* Specific button ID */
[name="username"]      /* Form field by name */
.modal .close-btn      /* Close button in modal */
```