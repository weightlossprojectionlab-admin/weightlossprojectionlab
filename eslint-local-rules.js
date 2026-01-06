/**
 * Custom ESLint rules for WPL
 *
 * These rules enforce design system compliance
 */

module.exports = {
  'no-hardcoded-colors': {
    meta: {
      type: 'problem',
      docs: {
        description: 'Disallow hardcoded Tailwind color classes (use semantic design tokens instead)',
        category: 'Design System',
        recommended: true
      },
      messages: {
        hardcodedColor: 'Avoid hardcoded color "{{color}}". Use semantic tokens instead (bg-primary, bg-error, bg-muted, etc.). See DESIGN_SYSTEM.md',
        hardcodedTextColor: 'Avoid hardcoded text color "{{color}}". Use semantic tokens instead (text-primary, text-error, text-muted-foreground, etc.). See DESIGN_SYSTEM.md'
      },
      fixable: null,
      schema: []
    },
    create(context) {
      // Hardcoded color patterns to detect
      const hardcodedBgColors = /\b(bg-gray-|bg-blue-|bg-indigo-|bg-green-|bg-red-|bg-yellow-|bg-purple-|bg-pink-|bg-orange-)/
      const hardcodedTextColors = /\b(text-gray-|text-blue-|text-indigo-|text-green-|text-red-|text-yellow-|text-purple-|text-pink-|text-orange-)/
      const hardcodedBorderColors = /\b(border-gray-|border-blue-|border-indigo-|border-green-|border-red-|border-yellow-|border-purple-|border-pink-|border-orange-)/

      return {
        // Check className attributes in JSX
        JSXAttribute(node) {
          if (node.name.name !== 'className') return

          let classNameValue = ''

          // Handle string literals
          if (node.value?.type === 'Literal' && typeof node.value.value === 'string') {
            classNameValue = node.value.value
          }
          // Handle template literals and expressions (skip for now - too complex)
          else if (node.value?.type === 'JSXExpressionContainer') {
            // For template literals, we can check static parts
            if (node.value.expression?.type === 'TemplateLiteral') {
              classNameValue = node.value.expression.quasis
                .map(q => q.value.cooked)
                .join(' ')
            }
            // Skip dynamic expressions
            else {
              return
            }
          }

          // Check for hardcoded background colors
          const bgMatch = classNameValue.match(hardcodedBgColors)
          if (bgMatch) {
            context.report({
              node,
              messageId: 'hardcodedColor',
              data: {
                color: bgMatch[0]
              }
            })
          }

          // Check for hardcoded text colors
          const textMatch = classNameValue.match(hardcodedTextColors)
          if (textMatch) {
            context.report({
              node,
              messageId: 'hardcodedTextColor',
              data: {
                color: textMatch[0]
              }
            })
          }

          // Check for hardcoded border colors
          const borderMatch = classNameValue.match(hardcodedBorderColors)
          if (borderMatch) {
            context.report({
              node,
              messageId: 'hardcodedColor',
              data: {
                color: borderMatch[0]
              }
            })
          }
        }
      }
    }
  }
}
