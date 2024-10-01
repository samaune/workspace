export const configResquel = {
    db: {
      client: "postgresql",
      connection: {
        host: "localhost",
        user: "postgres",
        password: "",
        database: ""
      }
    },
    routes: [{
        method: "get",
        endpoint: "/customer",
        query: "SELECT * FROM customers"
      }
    //   {
    //     method: "post",
    //     endpoint: "/customer",
    //     query: [
    //       "INSERT INTO customers (firstName, lastName, email) VALUES (?, ?, ?) RETURNING *;",
    //       "body.data.firstName",
    //       "body.data.lastName",
    //       "body.data.email"
    //     ]
    //   },
    //   {
    //     method: "get",
    //     endpoint: "/customer/:id",
    //     query: ["SELECT * FROM customers WHERE id=?", "params.id"]
    //   },
    //   {
    //     method: "put",
    //     endpoint: "/customer/:id",
    //     query: [
    //       [
    //         "UPDATE customers SET firstName=?, lastName=?, email=? WHERE id=? RETURNING *",
    //         "body.data.firstName",
    //         "body.data.lastName",
    //         "body.data.email",
    //         "params.id"
    //       ],
    //       ["SELECT * FROM customers WHERE id=?", "params.id"]
    //     ]
    //   },
    //   {
    //     method: "delete",
    //     endpoint: "/customer/:id",
    //     query: ["DELETE FROM customers WHERE id=?", "params.id"]
    //   }
    ]
  }
  