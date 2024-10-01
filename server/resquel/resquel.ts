import _, { AnyKindOfDictionary } from 'lodash';
// import basicAuth from 'basic-auth-connect';
// import bodyParser from 'body-parser';
//import express from 'express';
import { api } from "encore.dev/api";
import knex, { Knex } from 'knex';
import logger from './log';
// import methodOverride from 'method-override';
// import { Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { configResquel } from './config';

const { log, warn, debug, error } = logger('resquel');

export declare type ConnectionType = 'mssql' | 'mysql' | 'postgresql' | string;

export declare type ConfigRouteMethods =
  | 'get'
  | 'post'
  | 'put'
  | 'delete'
  | 'index'
  | string;

export declare type PreparedQuery = [string, ...(string | QueryParamLookup)[]];

type ConfigRouteQuery = string | PreparedQuery | PreparedQuery[];

export interface Response {
  status: number,
  requestId: string,
  result: any,
  route: any
}

export declare type QueryParam = {
  knex: Knex,
  resquel: Resquel,
  req: Request,
  res: Response
};
export declare type QueryParamLookup = (param: QueryParam) => Promise<string>;

export declare type ConfigRoute = {
  method: ConfigRouteMethods;
  endpoint: string;
  query: ConfigRouteQuery;
  before?: (req: Request, res: Response, next: () => Promise<void>) => unknown;
  after?: (req: Request, res: Response, next: () => Promise<void>) => unknown;
};

enum ErrorCodes {
  paramLookupFailed = 1001,
}

export interface ErrorResponse {
  errorCode: ErrorCodes;
  requestId: string;
  message?: string;
  status: number;
}

export declare type ResquelAuth = {
  username: string;
  password: string;
};

export declare type ResquelConfig = {
  port?: number;
  db: Knex.Config<any>;
  routes: ConfigRoute[];
  auth?: ResquelAuth;
};



export class Resquel {
  public knexClient: Knex | any;
  private resquelConfig: ResquelConfig = (configResquel as ResquelConfig);

  // constructor(private resquelConfig: ResquelConfig) {}
  constructor() {

  }
  

  public async init() {
    const config = this.resquelConfig || ({} as ResquelConfig);
    // log(`routerSetup`);
    // this.routerSetup(config.auth);

    log(`createKnexConnections`);
    this.createKnexConnections();

    log(`loadRoutes`);
    this.loadRoutes();
  }

  public sendError(
    res: Response,
    reason: string, // Make this human understandable
    errorCode: ErrorCodes | number,
  ) {
    res.status = res.status || 500;
    const out: ErrorResponse = {
      errorCode,
      message: reason,
      requestId: res.requestId,
      status: res.status,
    };
    // res.status(res.status).send(out);
  }

  public sendResponse(res: Response) {
    res.status = res.status || 200;
    log(
      `[${res.requestId}] Sending response w/ status ${res.status}`,
    );
    debug(res.result);
    // res.status(res.status).send(res.result);
  }

  protected createKnexConnections() {
    this.knexClient = knex(this.resquelConfig.db);
  }

  routes: any[] = [];
  protected loadRoutes() {
    this.resquelConfig.routes.forEach((route, idx) => {
      const method = route.method.toLowerCase();
      log(`${idx}) Register Route: ${route.method} ${route.endpoint}`);
      debug(route);
      log(
        `${idx}) ${route.method} ${route.endpoint}`,
      );
      // const apiroute = api(
      //   { expose: true, method: "GET", path: `/db/${method}/:name` },
      //   async ({ name }: { name: string }): Promise<any> => {
      //     const msg = `Hello ${name}!`;
      //     return { message: msg };
      //   }
      // );

      //this.routes.push(apiroute);

      

      // this.router[method](
      //   route.endpoint,
      //   async (req: Request, res: Response) => {
      //     // For aiding tracing in logs, all logs related to the request should contain this id
      //     res.requestId = uuid();
      //     res.route = route;
      //     log(
      //       `${idx}) ${route.method} ${route.endpoint} :: ${res.requestId}`,
      //     );
      //     // if (route.before) {
      //     //   await new Promise((done) => {
      //     //     route.before(req, res, async () => {
      //     //       done(null);
      //     //     });
      //     //   });
      //     // }
      //     const result = await this.processRouteQuery(
      //       route.query,
      //       req,
      //       this.knexClient,
      //     );
      //     this.sendResponse(res);
      //   },
      // );
    });
  }

  protected async processRouteQuery(
    routeQuery: ConfigRouteQuery,
    req: Request,
    knexClient: Knex,
  ): Promise<ErrorCodes | Knex.Raw<unknown>> {
    // Resolve route query into an array of prepared statements.
    // Example:
    //   ["SELECT * FROM customers WHERE id=?", "params.customerId"]
    //
    // Where params are passed as strings, use them as object paths on the req object
    // Where params are passed as functions (enterprise), call those and use the return results as params for this query
    //
    // If more than 1 query is passed, then this function will return the results from the final statement
    // Example:
    // [
    //   ["INSERT INTO customers (firstName, lastName, email) VALUES (?, ?, ?);", "body.firstName", "body.lastName", "body.email"],
    //   "SELECT * FROM customers WHERE id=SCOPE_IDENTITY();"
    // ]
    //

    if (typeof routeQuery === 'string') {
      // "SELECT * FROM `customers`"
      routeQuery = [[routeQuery]];
    }
    if (typeof routeQuery[0] === 'string') {
      // ["SELECT * FROM customers WHERE id=?", "params.customerId"]
      routeQuery = [routeQuery as PreparedQuery];
    }
    const isValid = (routeQuery as PreparedQuery[]).every(
      (i, idx) => idx === 0 || typeof i !== 'string',
    );
    if (!isValid) {
      // Probably a mix of prepared queries, and strings like this:
      // [
      //   ["Query 1","param","param"],
      //   "Query 2"
      // ]
      //
      // Should resolve by changing "Query 2" line to ["Query 2"]
      // Keep the types consistent
      //
      throw new Error(`Resquel is unable to resolve route query`);
    }
    // const res = req.res;
    const queries = []; //(res.queries = res.queries || []);

    let result: AnyKindOfDictionary[] = [];
    for (let i = 0; i < routeQuery.length; i++) {
      const query = [...(routeQuery[i] as PreparedQuery)];
      const queryString = query.shift() as string;
      const params: string[] = [];

      // params builder
      for (let j = 0; j < query.length; j++) {
        if (typeof query[j] === 'string') {
          const val = _.get(req, query[j] as string);
          if (val === undefined) {
            // log(
            //   `[${res.requestId}] lookup failed for param "${query[j]}"`,
            // );
            // debug(req.body);
            return ErrorCodes.paramLookupFailed;
          }
          params.push(val);
        } else {
          params.push(
            await (query[j] as QueryParamLookup)({
              resquel: this,
              knex: knexClient,
              req,
              res: {
                status: 0,
                requestId: '',
                result: undefined,
                route: undefined
              },
            }),
          );
        }
      } // /params builder
      try {
        result = this.resultProcess(
          knexClient,
          await knexClient.raw(queryString, params),
        );
      } catch (err) {
        error('QUERY FAILED');
        error({
          queryString,
          params,
          result: [],
        });
        error(err);
        continue;
      }
      // Example result:
      // [
      //   {
      //     id: 1,
      //     firstName: 'John',
      //     lastName: 'Doe',
      //     email: 'example@example.com',
      //   },
      // ];
      //
      // Example prepared query that utilizes result:
      // ["SELECT * FROM customer WHERE id=?", "res.queries[0].id"]
      //
      // This works because `req.res` is a thing:
      // express: After middleware.init executed, Request will contain res and next properties
      // See: express/lib/middleware/init.js
      //

      queries.push({
        queryString,
        params,
        result,
      });
    }
    return {
      rows: result,
    };
  }

  protected resultProcess(
    knexClient: Knex,
    result: any,
  ): AnyKindOfDictionary[] {
    switch (knexClient.client.config.client as ConnectionType) {
      case 'postgresql':
        return (result as { rows: AnyKindOfDictionary[] }).rows;
      case 'mysql':
        if ((result as AnyKindOfDictionary[]).length === 1) {
          return result as AnyKindOfDictionary[];
        }
        if (result[0].affectedRows !== undefined) {
          return [];
        }
        return result[0] as AnyKindOfDictionary[];
      default:
        return result as AnyKindOfDictionary[];
    }
  }

}
export default Resquel;
