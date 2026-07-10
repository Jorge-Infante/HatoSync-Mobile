---
name: react
description: React development including hooks, state management, performance optimization, and component patterns.
agent_ids: [alex]
---

# React Development Skill

React development including hooks, state management, performance optimization, and component patterns.

## Core Patterns

### 1. Component Structure
```tsx
// Presentational Component
function UserCard({ user, onSelect }: Props) {
  return (
    <div onClick={() => onSelect(user.id)}>
      <Avatar src={user.avatar} />
      <span>{user.name}</span>
    </div>
  );
}

// Container Component
function UserCardContainer({ userId }: { userId: string }) {
  const user = useUser(userId);
  const navigate = useNavigate();
  
  if (user.loading) return <Skeleton />;
  
  return <UserCard user={user.data} onSelect={navigate} />;
}
```

### 2. Hooks Patterns
```tsx
// Custom Hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}

// Compound Component
function Tabs({ children, defaultTab }: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}
```

### 3. State Management
```tsx
// Local State: useState
const [isOpen, setIsOpen] = useState(false);

// Shared State: useContext + useReducer
const [state, dispatch] = useReducer(cartReducer, initialState);

// Server State: React Query
const { data, isLoading, error } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5 * 60 * 1000,
});
```

### 4. Performance Patterns
```tsx
// Memoization
const MemoizedComponent = React.memo(
  ({ data }) => <List items={data} />,
  (prev, next) => prev.data === next.data
);

// useMemo for expensive calculations
const sortedList = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback for callbacks
const handleClick = useCallback(
  (id: string) => navigate(`/item/${id}`),
  [navigate]
);
```

## Component Checklist

```yaml
component_checklist:
  - [ ] TypeScript interfaces defined
  - [ ] Props destructured correctly
  - [ ] Default props handled
  - [ ] Loading state implemented
  - [ ] Error state implemented
  - [ ] Empty state implemented
  - [ ] Accessibility (ARIA labels)
  - [ ] Keyboard navigation
  - [ ] Tests written
  - [ ] Storybook story created
```

## File Structure

```
components/
├── UserCard/
│   ├── UserCard.tsx
│   ├── UserCard.test.tsx
│   ├── UserCard.stories.tsx
│   └── index.ts
```

## Common Issues

1. **Stale closures**: Use `useCallback` and `useMemo`
2. **Memory leaks**: Clean up subscriptions in `useEffect`
3. **Infinite loops**: Never put objects in `useEffect` deps
4. **Context re-renders**: Split contexts by update frequency
