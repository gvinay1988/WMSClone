# Application architecture

```mermaid
flowchart LR
    user[User]

    subgraph frontend["Angular 20 application"]
        browser["Browser UI"]
        router["Router and auth guard"]
        features["Routed feature pages<br/>Dashboard · Supplier Master · State Master · State & Tax · Configuration"]
        services["Angular services and HttpClient"]
        interceptor["Auth interceptor"]
        storage[("sessionStorage<br/>JWT and user")]

        browser --> router
        router --> features
        features --> services
        services --> interceptor
        interceptor <--> storage
    end

    subgraph api["Python Flask API · localhost:8000"]
        cors["CORS"]
        auth["POST /auth/login<br/>JWT issuer"]
        blueprints["Registered blueprints<br/>Supplier · State Master · State & Tax · Parameters · User configuration"]
        dbaccess["database.get_connection()"]
        jwthelper["JWT validation helper<br/>(defined in app.py)"]

        cors --> auth
        cors --> blueprints
        auth --> dbaccess
        blueprints --> dbaccess
        jwthelper -. "available, but not currently applied to routes" .-> blueprints
    end

    db[("MySQL<br/>employee_db by default")]

    user --> browser
    interceptor <-->|"HTTP / JSON<br/>Authorization header"| cors
    dbaccess --> db

    subgraph ssr["Optional server-side rendering"]
        express["Node.js Express + Angular SSR<br/>port 4000 by default"]
    end
    express -. "renders Angular pages; separate from Flask API" .-> browser
```

## Request and authentication flow

1. The Angular router loads the login page or guards the application layout.
2. `AuthService` sends login credentials to `POST /auth/login`. On success, it stores the returned JWT and user in browser `sessionStorage`.
3. Angular services make API requests through `HttpClient`; the auth interceptor adds the stored JWT as a bearer token.
4. Flask handles authentication and the registered feature blueprints, which access MySQL through `database.get_connection()`.
5. The optional Express SSR server renders Angular pages. It is not the API server.

The backend defines a JWT validation helper, but the registered route handlers do not currently use it as a decorator. The diagram therefore does not imply that API routes enforce the bearer token.

Employee feature code is present in the repository, but it is not currently registered in the root application routes.

`/master/statemaster` loads the State Master CRUD page (state code, state name, country, capital, and status). Its country options come from Parameter country data. State names in the first table column open records for editing; the last column contains delete actions. `/master/state-tax` loads the separate State & Tax CRUD page.

## Runtime endpoints

- Local Angular development server: `http://localhost:4200`
- Local Flask API: `http://127.0.0.1:8000`
- Optional Angular SSR server: `http://localhost:4000`
- Production Angular API base URL: configured in `src/app/Environment/environment.prod.ts`
