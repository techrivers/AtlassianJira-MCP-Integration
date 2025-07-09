# Contributing to Jira Activity Timeline MCP Server

Thank you for your interest in contributing! This guide will help you get started.

## Development Setup

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/jira-activitytimeline-server.git
   cd jira-activitytimeline-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   # Edit .env with your Jira credentials
   ```

4. **Build and test**
   ```bash
   npm run build
   npm test
   ```

## Making Changes

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow existing code patterns
   - Add TypeScript types
   - Include JSDoc comments
   - Write tests for new features

3. **Test your changes**
   ```bash
   npm run build
   npm test
   npm run dev  # Test locally
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

5. **Create Pull Request**
   - Describe what your PR does
   - Link to relevant issues
   - Include screenshots if UI changes

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public functions
- Use meaningful variable names
- Keep functions small and focused

## Testing

- Write unit tests for new features
- Test with real Jira instance
- Verify Claude Desktop integration
- Check error handling

## Documentation

- Update README.md if needed
- Add examples for new features
- Update JSDoc comments
- Include configuration examples

## Pull Request Process

1. Ensure tests pass
2. Update documentation
3. Add examples if needed
4. Request review from maintainers
5. Address feedback
6. Merge after approval

## Issue Reporting

- Use GitHub Issues for bugs
- Include environment details
- Provide reproduction steps
- Add error messages/logs

## Questions?

- Open a GitHub Discussion
- Ask in pull request comments
- Contact maintainers directly

Thank you for contributing! 🚀
