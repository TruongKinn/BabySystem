# common-lib

Shared components for backend services in Mom Super App.

## Packages

- `com.mom.common.dto`
- `com.mom.common.exception`
- `com.mom.common.audit`
- `com.mom.common.constants`
- `com.mom.common.kafka`
- `com.mom.common.utils`

## Build

```bash
./mvnw clean install
```

Build `common-lib` before other services that depend on it.
