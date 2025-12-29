# Cambios para Responsive Mobile

## Resumen
Se necesita agregar soporte móvil completo al portal. Incluye:
1. Menú hamburger para móvil
2. Sidebar que se oculta/muestra con overlay
3. Topbar responsive
4. Grid/layouts que se adaptan a pantallas pequeñas

## Archivos que necesitan cambios:

### 1. Portal Layout (src/app/portal/layout.tsx)
✅ Ya agregué imports de Menu y X
✅ Ya agregué estado mobileMenuOpen

**Cambios pendientes en línea ~267:**

REEMPLAZAR:
```tsx
      <div className="relative flex h-dvh w-full">
        {/* SIDEBAR */}
        <aside
          className={cn(
            "group/sidebar flex h-full flex-col overflow-hidden",
            "w-[84px] hover:w-64",
```

CON:
```tsx
      <div className="relative flex h-dvh w-full">
        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="fixed top-3 left-3 z-[60] lg:hidden p-2 rounded-xl bg-surface/90 backdrop-blur-md border border-border text-white hover:bg-surface"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {/* MOBILE OVERLAY */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-[55] lg:hidden backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* SIDEBAR */}
        <aside
          className={cn(
            "group/sidebar flex h-full flex-col overflow-hidden",
            // Desktop: hover to expand
            "lg:w-[84px] lg:hover:w-64",
            // Mobile: full width drawer from left
            "w-72 fixed lg:relative inset-y-0 left-0 z-[56]",
            "transition-transform duration-300 lg:translate-x-0",
            mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
```

**Y cerrar el aside móvil al navegar - agregar al NavItem en línea ~570:**

```tsx
function NavItem({
  href,
  label,
  active,
  icon,
  onClick,
}: {
  href: string;
  label: string;
  active?: boolean;
  icon: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
```

**Modificar los NavItem renders para cerrar menú móvil (líneas ~300-340):**

```tsx
<NavItem
  key={it.href}
  href={it.href}
  label={it.label}
  active={active}
  icon={<Icon className="h-5 w-5" />}
  onClick={() => setMobileMenuOpen(false)}
/>
```

### 2. Topbar responsive (línea ~402)

REEMPLAZAR:
```tsx
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/40 backdrop-blur-xl">
            <div className="h-full flex items-center justify-between px-6 md:px-8">
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-zinc-500">
```

CON:
```tsx
          <header className="sticky top-0 z-40 h-14 border-b border-border bg-bg/40 backdrop-blur-xl">
            <div className="h-full flex items-center justify-between pl-16 pr-4 lg:pl-6 lg:pr-8">
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm text-zinc-500">
```

### 3. Content area responsive (línea ~545)

REEMPLAZAR:
```tsx
          <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-6 md:px-8 pb-8 animate-fade-in">
```

CON:
```tsx
          <main ref={contentRef} className="flex-1 min-w-0 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 animate-fade-in">
```

### 4. Dashboard Cards (src/app/portal/page.tsx)

Buscar grids y agregar breakpoints:
- `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- `grid-cols-1 lg:grid-cols-2`

### 5. Autolavado Dashboard (src/app/portal/custom/autolavado/dashboard/page.tsx)

Similar - agregar breakpoints responsive en grids.

### 6. Tablas responsive

En tablas grandes, agregar:
```tsx
<div className="overflow-x-auto -mx-4 sm:mx-0">
  <table className="min-w-full">
```

## Prioridad de cambios:

1. **HIGH**: Portal layout mobile menu
2. **HIGH**: Topbar padding mobile
3. **MEDIUM**: Dashboard grids
4. **MEDIUM**: Autolavado grids  
5. **LOW**: Optimizar formularios para móvil
