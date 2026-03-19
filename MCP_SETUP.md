# MCP Server Setup Guide

## MCP Servers Configured

### 1. Figma MCP Server
- **Location**: `.windsurf/mcp.json`
- **Type**: Remote (Figma's hosted endpoint)
- **Status**: ⚠️ Needs API key

**Setup Steps:**
1. Visit https://www.figma.com/developers/api
2. Sign in to your Figma account
3. Go to "Personal Access Tokens"
4. Click "Create new token"
5. Give it a name (e.g., "Windsurf MCP")
6. Select scope: "Read file contents"
7. Copy the token
8. Open `.windsurf/mcp.json`
9. Replace `YOUR_FIGMA_API_KEY_HERE` with your actual token
10. Save the file
11. Restart Windsurf IDE

**What You Can Do:**
- Generate code from Figma frames
- Extract design tokens, colors, typography
- Access component libraries
- Convert designs to React/HTML/CSS code

---

### 2. Playwright MCP Server
- **Location**: `.windsurf/mcp.json`
- **Type**: STDIO (local process)
- **Status**: ✅ Ready to use

**Setup Steps:**
1. Ensure Node.js 18+ is installed
2. Restart Windsurf IDE
3. The server will auto-install on first use

**What You Can Do:**
- Automate browser testing
- Test your subscription revenue simulator UI
- Generate accessibility reports
- Create end-to-end tests
- Navigate and interact with web pages

---

## Usage Examples

### Figma MCP Usage:
```
"Convert this Figma design to React components: [Figma URL]"
"Extract the color palette from my design file"
"Generate CSS from this Figma frame"
```

### Playwright MCP Usage:
```
"Test the subscription revenue simulator form submission"
"Navigate to the app and verify the charts render correctly"
"Check if all input fields accept valid data"
"Take a screenshot of the metrics section"
```

---

## Verification

To verify MCP servers are working:
1. Restart Windsurf
2. Open the MCP panel (usually in sidebar)
3. You should see both "figma" and "playwright" servers listed
4. Check that they show as "connected"

---

## Troubleshooting

**Figma MCP not connecting:**
- Verify API key is correct
- Check internet connection
- Ensure token has "Read file contents" permission

**Playwright MCP not working:**
- Run `npm install -g @playwright/mcp`
- Check Node.js version: `node --version` (should be 18+)
- Try reinstalling: `npx playwright install`

---

## Project Integration

For your **Subscription Revenue Simulator**, these MCP servers enable:

**Figma:**
- Design-to-code workflow
- Maintain design consistency
- Extract design tokens for theming

**Playwright:**
- Automated UI testing
- Cross-browser compatibility checks
- Performance testing
- Visual regression testing

---

## Next Steps

1. Add your Figma API key to `.windsurf/mcp.json`
2. Restart Windsurf
3. Test both MCP servers with simple commands
4. Start using Figma for design and Playwright for testing

**Need Help?**
- Figma MCP Docs: https://developers.figma.com/docs/figma-mcp-server/
- Playwright MCP Docs: https://github.com/microsoft/playwright-mcp
