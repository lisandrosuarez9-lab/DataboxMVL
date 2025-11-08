# DataboxMVL Sovereign Protocol Suite

Modern React 18-based application for identity-centric data injection with consent enforcement and comprehensive audit capabilities.

🌐 **Live Demo**: [https://lisandrosuarez9-lab.github.io/DataboxMVL/](https://lisandrosuarez9-lab.github.io/DataboxMVL/)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run type checking
npm run typecheck

# Run linting
npm run lint
```

### 🤖 Automated Deployment

For production deployment, use the Launch Automation Agent:

```bash
# Validate environment (dry run)
npm run launch-agent:dry-run

# Deploy to GitHub Pages
npm run launch-agent
```

See [Launch Agent Documentation](docs/LAUNCH_AGENT.md) for complete details on deterministic deployment automation.

## 🏗️ Architecture

This application has been completely modernized from a monolithic HTML structure to a cutting-edge React 18-based architecture:

### Frontend Stack
- **React 18** - Modern component-based architecture with hooks
- **TypeScript** - Full type safety throughout the application
- **Vite** - Fast build tool with optimized bundling
- **Tailwind CSS 3.0** - Utility-first CSS framework with custom design tokens
- **Redux Toolkit** - Predictable state management
- **React Router** - Client-side routing with protected routes

### Key Features
- 🛡️ **Role-based Access Control** - Compliance and Service Role authentication
- 📊 **Real-time Dashboard** - Live monitoring of persona flags and audit logs
- 🔐 **Security & Compliance** - Row Level Security (RLS) and immutable audit records
- 🏛️ **Ownership Audit System** - FactorA Universal Ownership & Attribution Mandate enforcement
- 📱 **Responsive Design** - Mobile-first approach with modern UI components
- ⚡ **Performance Optimized** - Code splitting, lazy loading, and PWA support
- ♿ **Accessibility** - WCAG 2.1 AA compliance foundation
- 🎨 **Design System** - Comprehensive component library with consistent branding

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Basic UI components (Button, Card, etc.)
│   ├── layout/         # Layout components (Header, Footer, Layout)
│   ├── dashboard/      # Dashboard-specific components
│   └── forms/          # Form components
├── pages/              # Application pages/routes
├── stores/             # Redux store and slices
├── types/              # TypeScript type definitions
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── styles/             # Global styles and Tailwind config
└── assets/             # Static assets
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build optimized production bundle
- `npm run preview` - Preview production build locally
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run ESLint with accessibility checks
- `npm run lint:fix` - Auto-fix linting issues

### Code Quality

- **TypeScript** for type safety and better developer experience
- **ESLint** with React, TypeScript, and accessibility plugins
- **Prettier** for consistent code formatting
- **Husky** for pre-commit hooks (ready to configure)

## 🎨 Design System

The application uses a comprehensive design system built with Tailwind CSS:

### Colors
- **Primary**: Brand colors (#1e3c72, #2a5298)
- **Accent**: Success and action colors (#10b981)
- **Semantic**: Error, warning, info, and success colors
- **Chart**: Optimized color palette for data visualization

### Typography
- **Font**: Inter with proper fallbacks
- **Scale**: Mathematical progression for consistent hierarchy
- **Responsive**: Adaptive sizing across breakpoints

### Components
- **Button**: Multiple variants (primary, secondary, accent, ghost)
- **Card**: Flexible containers with optional headers and actions
- **Loading States**: Skeleton screens and spinners
- **Forms**: Styled inputs with validation support

## 📊 Dashboard Features

### Metrics Overview
- **Total Personas**: Real-time count with trend indicators
- **Review Needed**: Flagged items requiring attention
- **Audit Entries**: Complete audit trail statistics

### Data Tables
- **Persona Flags**: Interactive table with filtering and sorting
- **Audit Log**: Immutable audit records with action tracking
- **Real-time Updates**: Live data synchronization

### Connection Status
- **Database Health**: Connection and performance monitoring
- **Security Status**: RLS and compliance indicators
- **Sync Status**: Real-time synchronization health

## 🔐 Security & Compliance

### Access Control
- **Role-based Authentication**: Compliance (read-only) and Service Role (full access)
- **Protected Routes**: Authentication required for sensitive areas
- **Permission System**: Granular access control

### Audit Trail
- **Immutable Records**: Complete audit history preservation
- **Real-time Monitoring**: Live tracking of all changes
- **Compliance Ready**: Retention and regulatory compliance

### Ownership Audit System
The application implements the **FactorA Universal Ownership & Attribution Mandate** to ensure data sovereignty:

- **Schema-level Enforcement**: Every operational record anchored to `profiles.user_id`
- **Automated Detection**: CI/CD pipeline detects orphaned records
- **Immutable Logging**: All ownership changes permanently logged
- **Fail-fast Compliance**: Pipeline fails if orphans detected

**Quick Start:**
1. See [`docs/OWNERSHIP_AUDIT_QUICKSTART.md`](docs/OWNERSHIP_AUDIT_QUICKSTART.md) for setup
2. Configure `DATABASE_URL` secret in GitHub repository settings
3. Workflow runs automatically on push to `main`
4. Review artifacts if orphans detected

**Detailed Documentation:**
- [`MANDATE.md`](MANDATE.md) - Complete specification
- [`db/ownership/README.md`](db/ownership/README.md) - Technical details
- [`scripts/test-ownership-audit.sh`](scripts/test-ownership-audit.sh) - Test suite

## 🚀 Performance

### Build Optimization
- **Code Splitting**: Automatic chunking by route and feature
- **Tree Shaking**: Unused code elimination
- **Asset Optimization**: Image compression and format optimization
- **Bundle Analysis**: Detailed build output analysis

### Runtime Performance
- **Lazy Loading**: Components loaded on demand
- **Memoization**: Optimized re-rendering
- **Virtual Scrolling**: Efficient large data set handling
- **PWA Support**: Offline capability and caching

## 🌐 Browser Support

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Mobile**: iOS Safari, Chrome Mobile
- **Progressive Enhancement**: Graceful degradation for older browsers

## 📱 Mobile Support

- **Responsive Design**: Mobile-first approach
- **Touch Optimization**: Gesture-friendly interactions
- **Performance**: Optimized for mobile networks
- **PWA**: Installable as mobile app

## 🧪 Testing

Testing infrastructure is configured and ready:

- **Unit Tests**: Jest with React Testing Library
- **Component Tests**: Isolated component testing
- **Type Safety**: TypeScript compilation checks
- **Accessibility**: Automated a11y testing with ESLint plugins

## 📈 Analytics & Monitoring

Ready for integration:

- **Performance Monitoring**: Web Vitals API integration
- **Error Tracking**: Error boundary system in place
- **User Analytics**: Event tracking foundation
- **Build Analysis**: Bundle size and performance metrics

## 🔄 Migration from Legacy

The application has been completely modernized:

### Before
- Single 2,178-line HTML file
- Embedded styles and scripts
- No component architecture
- No build optimization
- No type safety

### After
- Modular React components (20+ components)
- TypeScript throughout
- Modern build system with Vite
- Optimized bundles with code splitting
- Comprehensive design system

## 📝 Contributing

1. **Code Style**: Follow established patterns and use TypeScript
2. **Components**: Create reusable, accessible components
3. **Testing**: Add tests for new functionality
4. **Documentation**: Update docs for new features
5. **Performance**: Consider performance impact of changes

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Support

For questions or support:
- Create an issue in the repository
- Check the ARCHITECTURE.md for detailed technical documentation
- Review component documentation in the codebase

---

**DataboxMVL** - Modern, secure, and scalable identity management platform.