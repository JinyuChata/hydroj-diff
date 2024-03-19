import AdmZip from "adm-zip";
import { readFile, statSync } from "fs-extra";
import { escapeRegExp, flattenDeep, intersection, pick, uniqBy } from "lodash";
import { Filter, ObjectId } from "mongodb";
import { nanoid } from "nanoid";
import sanitize from "sanitize-filename";
import parser from "@hydrooj/utils/lib/search";
import {
  errorMessage,
  sortFiles,
  streamToBuffer,
} from "@hydrooj/utils/lib/utils";
import {
  BadRequestError,
  ContestNotAttendedError,
  ContestNotEndedError,
  ContestNotFoundError,
  ContestNotLiveError,
  FileLimitExceededError,
  HackFailedError,
  NoProblemError,
  NotFoundError,
  PermissionError,
  ProblemAlreadyExistError,
  ProblemAlreadyUsedByContestError,
  ProblemConfigError,
  ProblemIsReferencedError,
  ProblemNotAllowLanguageError,
  ProblemNotAllowPretestError,
  ProblemNotFoundError,
  RecordNotFoundError,
  SolutionNotFoundError,
  UserFacingError,
  ValidationError,
} from "../error";
import {
  ProblemDoc,
  ProblemSearchOptions,
  ProblemStatusDoc,
  RecordDoc,
  User,
} from "../interface";
import paginate from "../lib/paginate";
import { PERM, PRIV, STATUS } from "../model/builtin";
import * as contest from "../model/contest";
import * as discussion from "../model/discussion";
import domain from "../model/domain";
import * as oplog from "../model/oplog";
import problem from "../model/problem";
import record from "../model/record";
import * as setting from "../model/setting";
import solution from "../model/solution";
import storage from "../model/storage";
import * as system from "../model/system";
import user from "../model/user";
import { Handler, param, post, query, route, Types } from "../service/server";
import { buildProjection } from "../utils";
import { registerResolver, registerValue } from "./api";
import { ContestDetailBaseHandler } from "./contest";
import { Logger } from "@hydrooj/utils";

export const parseCategory = (value: string) =>
  value
    .replace(/，/g, ",")
    .split(",")
    .map((e) => e.trim());

registerValue("FileInfo", [
  ["_id", "String!"],
  ["name", "String!"],
  ["size", "Int"],
  ["lastModified", "Date"],
]);
registerValue("Problem", [
  ["_id", "ObjectID!"],
  ["owner", "Int!"],
  ["domainId", "String!"],
  ["docId", "Int!"],
  ["docType", "Int!"],
  ["pid", "String"],
  ["title", "String!"],
  ["content", "String!"],
  ["config", "String!"],
  ["data", "[FileInfo]"],
  ["additional_file", "[FileInfo]"],
  ["nSubmit", "Int"],
  ["nAccept", "Int"],
  ["difficulty", "Int"],
  ["tag", "[String]"],
  ["hidden", "Boolean"],
]);

registerResolver(
  "Query",
  "problem(id: Int, pid: String)",
  "Problem",
  async (arg, ctx) => {
    ctx.checkPerm(PERM.PERM_VIEW);
    const pdoc = await problem.get(ctx.args.domainId, arg.pid || arg.id);
    if (!pdoc) return null;
    if (pdoc.hidden) ctx.checkPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN);
    ctx.pdoc = pdoc;
    return pdoc;
  },
);
registerResolver(
  "Query",
  "starredProblems(limit: Int, page: Int)",
  "[Problem]",
  async (arg, ctx) => {
    const currentPage = arg.page || 1,
      pageSize = arg.limit || 10;
    ctx.checkPerm(PERM.PERM_VIEW);
    const psdocs = await problem
      .getMultiStatus(ctx.args.domainId, {
        uid: ctx.user._id,
        star: true,
      })
      .skip((currentPage - 1) * pageSize)
      .sort("_id", 1)
      .limit(pageSize)
      .toArray();
    const psdict = {};
    for (const psdoc of psdocs) psdict[psdoc.docId] = psdoc;
    const pdict = await problem.getList(
      ctx.args.domainId,
      psdocs.map((pdoc) => pdoc.docId),
      ctx.user.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN) || ctx.user._id,
      false,
      undefined,
      true,
    );
    if (!pdict) return null;
    // if (pdoc.hidden) ctx.checkPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN);
    return Object.keys(pdict).map((id) => ({
      ...pdict[+id],
      pid: parseInt(id),
    }));
  },
  "Get a list of problems starred by current user",
);
registerResolver(
  "Query",
  "problems(ids: [Int], starred: Boolean, faulted: Boolean, limit: Int, page: Int)",
  "[Problem]",
  async (arg, ctx) => {
    ctx.checkPerm(PERM.PERM_VIEW);
    let r: any;
    if (arg.starred) {
      const res = await problem.getMultiStatus(ctx.args.domainId, {
        uid: ctx.user._id,
        star: true,
      });

      // 判断分页逻辑
      const [psdocs, pspcount] =
        ctx.args.limit && ctx.args.page
          ? await paginate(res, ctx.args.limit, ctx.args.page)
          : ([
              await res
                .sort("_id", 1)
                .limit(arg.limit ?? 50)
                .toArray(),
              0,
            ] as const);

      const psdict = {};
      for (const psdoc of psdocs) psdict[psdoc.docId] = psdoc;
      const pdict = await problem.getList(
        ctx.args.domainId,
        psdocs.map((pdoc) => pdoc.docId),
        ctx.user.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN) || ctx.user._id,
        false,
        undefined,
        true,
      );
      r = pdict || null;
    } else {
      r = await problem.getList(
        ctx.args.domainId,
        arg.ids,
        ctx.user.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN) || ctx.user._id,
        undefined,
        undefined,
        true,
      );
    }
    const formatRes = (res: any) =>
      Object.keys(res).map((id) => ({
        ...res[+id],
        pid: +id,
      }));
    if (!r) return null;
    return formatRes(r);
  },
  "Get a list of problem by ids",
);
registerResolver("Problem", "manage", "ProblemManage", (arg, ctx) => {
  if (!ctx.user.own(ctx.pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
    ctx.checkPerm(PERM.PERM_EDIT_PROBLEM);
  return {};
});
registerResolver("ProblemManage", "delete", "Boolean!", async (arg, ctx) => {
  const tdocs = await contest.getRelated(ctx.args.domainId, ctx.pdoc.docId);
  if (tdocs.length)
    throw new ProblemAlreadyUsedByContestError(ctx.pdoc.docId, tdocs[0]._id);
  return problem.del(ctx.pdoc.domainId, ctx.pdoc.docId);
});
registerResolver(
  "ProblemManage",
  "edit(title: String, content: String, tag: [String], hidden: Boolean)",
  "Problem!",
  (arg, ctx) => problem.edit(ctx.args.domainId, ctx.pdoc.docId, arg),
);

async function buildQuery(udoc: User, domainId: string) {
  let q: Filter<ProblemDoc> = {};
  const groups = (await user.listGroup(domainId, udoc._id)).map((i) => i.name);
  console.log("buildQuery groups", groups);
  if (!udoc.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN)) {
    q = {
      ...{
        $and: [
          {
            $or: [
              { assign: { $in: groups } },
              { assign: { $size: 0 } },
              { assign: { $exists: false } },
            ],
          },
          {
            $or: [
              { hidden: false },
              { owner: udoc._id },
              { maintainer: udoc._id },
            ],
          },
        ],
      },
    };
  }
  console.log("q", q);
  return q;
}
async function buildQueryAll(udoc: User, domainId: string) {
  let q: Filter<ProblemDoc> = {};
  if (!udoc.hasPerm(PERM.PERM_VIEW_PROBLEM_HIDDEN)) {
    q = {
      ...{
        $and: [
          {
            $or: [
              { hidden: false },
              { owner: udoc._id },
              { maintainer: udoc._id },
            ],
          },
        ],
      },
    };
  }
  console.log("q", q);
  return q;
}

const defaultSearch = async (
  domainId: string,
  q: string,
  options?: ProblemSearchOptions,
) => {
  console.log("search-defaultsearch");
  const escaped = escapeRegExp(q.toLowerCase());
  const $regex = new RegExp(q.length >= 2 ? escaped : `\\A${escaped}`, "gmi");
  const filter = {
    $or: [{ pid: { $regex } }, { title: { $regex } }, { tag: q }],
  };
  const pdocs = await problem
    .getMulti(domainId, filter, ["domainId", "docId", "pid"])
    .skip(options.skip || 0)
    .limit(options.limit || system.get("pagination.problem"))
    .toArray();
  if (!Number.isNaN(+q)) {
    const pdoc = await problem.get(domainId, +q, [
      "domainId",
      "docId",
      "pid",
      "title",
    ]);
    if (pdoc) pdocs.unshift(pdoc);
  }
  return {
    hits: pdocs.map((i) => `${i.domainId}/${i.docId}`),
    total: await problem.count(domainId, filter),
    countRelation: "eq",
  };
};

export class ProblemMainTestHandler extends Handler {
  @param("page", Types.PositiveInt, true)
  @param("q", Types.Content, true)
  @param("limit", Types.PositiveInt, true)
  @param("pjax", Types.Boolean)
  async get(domainId: string, page = 1, q = "", limit: number, pjax = false) {
    await global.Hydro.script.rp?.run({}, new Logger("task/rp").debug);
    this.response.template = "problem_main.html";
    if (!limit || limit > system.get("pagination.problem") || page > 1)
      limit = system.get("pagination.problem");
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const query = await buildQuery(this.user, domainId);
    const psdict = {};
    console.log("search-defaultsearch?");
    const search = global.Hydro.lib.problemSearch || defaultSearch;
    // const search = defaultSearch;
    let sort: string[];
    let fail = false;
    let pcountRelation = "eq";
    const parsed = parser.parse(q, {
      keywords: ["category", "difficulty"],
      offsets: false,
      alwaysArray: true,
      tokenize: true,
    });
    const category = parsed.category || [];
    const text = (parsed.text || []).join(" ");
    if (parsed.difficulty?.every((i) => Number.isSafeInteger(+i))) {
      query.difficulty = { $in: parsed.difficulty.map(Number) };
    }
    if (category.length) {
      query.$and ||= [];
      query.$and.push(...category.map((tag) => ({ tag })));
    }
    if (text) category.push(text);
    if (category.length) this.UiContext.extraTitleContent = category.join(",");
    let total = 0;
    console.log("query:", query);
    if (text) {
      const result = await search(domainId, q, {
        skip: (page - 1) * limit,
        limit,
      });
      total = result.total;
      pcountRelation = result.countRelation;
      if (!result.hits.length) fail = true;
      query.$and ||= [];
      query.$and.push({
        $or: result.hits.map((i) => {
          const [did, docId] = i.split("/");
          return { domainId: did, docId: +docId };
        }),
      });
      sort = result.hits;
    }
    await this.ctx.parallel("problem/list", query, this);
    // eslint-disable-next-line prefer-const
    let [pdocs, ppcount, pcount] = fail
      ? [[], 0, 0]
      : await problem.list(
          domainId,
          query,
          sort?.length ? 1 : page,
          limit,
          undefined,
          this.user._id,
        );
    if (total) {
      pcount = total;
      ppcount = Math.ceil(total / limit);
    }
    if (sort)
      pdocs = pdocs.sort(
        (a, b) =>
          sort.indexOf(`${a.domainId}/${a.docId}`) -
          sort.indexOf(`${b.domainId}/${b.docId}`),
      );
    if (q && page === 1) {
      const pdoc = await problem.get(
        domainId,
        +q || q,
        problem.PROJECTION_LIST,
      );
      if (pdoc && problem.canViewBy(pdoc, this.user)) {
        const count = pdocs.length;
        pdocs = pdocs.filter((doc) => doc.docId !== pdoc.docId);
        pdocs.unshift(pdoc);
        pcount = pcount - count + pdocs.length;
      }
    }
    if (text && pcount > pdocs.length) pcount = pdocs.length;
    if (this.user.hasPriv(PRIV.PRIV_USER_PROFILE)) {
      const domainIds = Array.from(new Set(pdocs.map((i) => i.domainId)));
      await Promise.all(
        domainIds.map((did) =>
          problem
            .getListStatus(
              did,
              this.user._id,
              pdocs.filter((i) => i.domainId === did).map((i) => i.docId),
            )
            .then((res) => Object.assign(psdict, res)),
        ),
      );
    }
    if (pjax) {
      this.response.body = {
        title: this.renderTitle(this.translate("problem_main")),
        fragments: (
          await Promise.all([
            this.renderHTML("partials/problem_list.html", {
              page,
              ppcount,
              pcount,
              pdocs,
              psdict,
              qs: q,
            }),
            this.renderHTML("partials/problem_stat.html", {
              pcount,
              pcountRelation,
            }),
            this.renderHTML("partials/problem_lucky.html", { qs: q }),
          ])
        ).map((i) => ({ html: i })),
      };
    } else {
      this.response.body = {
        page,
        pcount,
        ppcount,
        pcountRelation,
        pdocs,
        psdict,
        qs: q,
      };
    }
  }

  @param("pid", Types.UnsignedInt)
  async postStar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, true);
    this.back({ star: true });
  }

  @param("pid", Types.UnsignedInt)
  async postUnstar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, false);
    this.back({ star: false });
  }

  @param("pids", Types.NumericArray)
  @param("target", Types.String)
  async postCopy(domainId: string, pids: number[], target: string) {
    const t = `,${this.domain.share || ""},`;
    if (t !== ",*," && !t.includes(`,${target},`))
      throw new PermissionError(target);
    const ddoc = await domain.get(target);
    if (!ddoc) throw new NotFoundError(target);
    const dudoc = await user.getById(target, this.user._id);
    if (!dudoc.hasPerm(PERM.PERM_CREATE_PROBLEM))
      throw new PermissionError(PERM.PERM_CREATE_PROBLEM);
    const ids = [];
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      ids.push(await problem.copy(domainId, pid, target));
    }
    this.response.body = ids;
  }

  @param("pids", Types.NumericArray)
  async postDelete(domainId: string, pids: number[]) {
    let i = 0;
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!pdoc) continue;
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.del(domainId, pid);
      i++;
      this.progress("Deleting: ({0}/{1})", [i, pids.length]);
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postHide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: true });
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postUnhide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: false });
    }
    this.back();
  }
}

export class ProblemMainHandler extends Handler {
  @param("page", Types.PositiveInt, true)
  @param("q", Types.Content, true)
  @param("limit", Types.PositiveInt, true)
  @param("pjax", Types.Boolean)
  async get(domainId: string, page = 1, q = "", limit: number, pjax = false) {
    this.response.template = "problem_main.html";
    if (!limit || limit > system.get("pagination.problem") || page > 1)
      limit = system.get("pagination.problem");
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const query = await buildQuery(this.user, domainId);
    const psdict = {};
    console.log("search-defaultsearch?");
    const search = global.Hydro.lib.problemSearch || defaultSearch;
    // const search = defaultSearch;
    let sort: string[];
    let fail = false;
    let pcountRelation = "eq";
    const parsed = parser.parse(q, {
      keywords: ["category", "difficulty"],
      offsets: false,
      alwaysArray: true,
      tokenize: true,
    });
    const category = parsed.category || [];
    const text = (parsed.text || []).join(" ");
    if (parsed.difficulty?.every((i) => Number.isSafeInteger(+i))) {
      query.difficulty = { $in: parsed.difficulty.map(Number) };
    }
    if (category.length) {
      query.$and ||= [];
      query.$and.push(...category.map((tag) => ({ tag })));
    }
    if (text) category.push(text);
    if (category.length) this.UiContext.extraTitleContent = category.join(",");
    let total = 0;
    console.log("query:", query);
    if (text) {
      const result = await search(domainId, q, {
        skip: (page - 1) * limit,
        limit,
      });
      total = result.total;
      pcountRelation = result.countRelation;
      if (!result.hits.length) fail = true;
      query.$and ||= [];
      query.$and.push({
        $or: result.hits.map((i) => {
          const [did, docId] = i.split("/");
          return { domainId: did, docId: +docId };
        }),
      });
      sort = result.hits;
    }
    await this.ctx.parallel("problem/list", query, this);
    // eslint-disable-next-line prefer-const
    let [pdocs, ppcount, pcount] = fail
      ? [[], 0, 0]
      : await problem.list(
          domainId,
          query,
          sort?.length ? 1 : page,
          limit,
          undefined,
          this.user._id,
        );
    if (total) {
      pcount = total;
      ppcount = Math.ceil(total / limit);
    }
    if (sort)
      pdocs = pdocs.sort(
        (a, b) =>
          sort.indexOf(`${a.domainId}/${a.docId}`) -
          sort.indexOf(`${b.domainId}/${b.docId}`),
      );
    if (q && page === 1) {
      const pdoc = await problem.get(
        domainId,
        +q || q,
        problem.PROJECTION_LIST,
      );
      if (pdoc && problem.canViewBy(pdoc, this.user)) {
        const count = pdocs.length;
        pdocs = pdocs.filter((doc) => doc.docId !== pdoc.docId);
        pdocs.unshift(pdoc);
        pcount = pcount - count + pdocs.length;
      }
    }
    if (text && pcount > pdocs.length) pcount = pdocs.length;
    if (this.user.hasPriv(PRIV.PRIV_USER_PROFILE)) {
      const domainIds = Array.from(new Set(pdocs.map((i) => i.domainId)));
      await Promise.all(
        domainIds.map((did) =>
          problem
            .getListStatus(
              did,
              this.user._id,
              pdocs.filter((i) => i.domainId === did).map((i) => i.docId),
            )
            .then((res) => Object.assign(psdict, res)),
        ),
      );
    }
    if (pjax) {
      this.response.body = {
        title: this.renderTitle(this.translate("problem_main")),
        fragments: (
          await Promise.all([
            this.renderHTML("partials/problem_list.html", {
              page,
              ppcount,
              pcount,
              pdocs,
              psdict,
              qs: q,
            }),
            this.renderHTML("partials/problem_stat.html", {
              pcount,
              pcountRelation,
            }),
            this.renderHTML("partials/problem_lucky.html", { qs: q }),
          ])
        ).map((i) => ({ html: i })),
      };
    } else {
      this.response.body = {
        page,
        pcount,
        ppcount,
        pcountRelation,
        pdocs,
        psdict,
        qs: q,
      };
    }
  }

  @param("pid", Types.UnsignedInt)
  async postStar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, true);
    this.back({ star: true });
  }

  @param("pid", Types.UnsignedInt)
  async postUnstar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, false);
    this.back({ star: false });
  }

  @param("pids", Types.NumericArray)
  @param("target", Types.String)
  async postCopy(domainId: string, pids: number[], target: string) {
    const t = `,${this.domain.share || ""},`;
    if (t !== ",*," && !t.includes(`,${target},`))
      throw new PermissionError(target);
    const ddoc = await domain.get(target);
    if (!ddoc) throw new NotFoundError(target);
    const dudoc = await user.getById(target, this.user._id);
    if (!dudoc.hasPerm(PERM.PERM_CREATE_PROBLEM))
      throw new PermissionError(PERM.PERM_CREATE_PROBLEM);
    const ids = [];
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      ids.push(await problem.copy(domainId, pid, target));
    }
    this.response.body = ids;
  }

  @param("pids", Types.NumericArray)
  async postDelete(domainId: string, pids: number[]) {
    let i = 0;
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!pdoc) continue;
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.del(domainId, pid);
      i++;
      this.progress("Deleting: ({0}/{1})", [i, pids.length]);
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postHide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: true });
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postUnhide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: false });
    }
    this.back();
  }
}

export class ProblemMainAPIHandler extends Handler {
  @param("page", Types.PositiveInt, true)
  @param("q", Types.Content, true)
  @param("ilanguage", Types.Content, true)
  @param("icompetition", Types.Content, true)
  @param("ilevel", Types.Content, true)
  @param("limit", Types.PositiveInt, true)
  async get(
    domainId: string,
    page = 1,
    q = "",
    ilanguage: string = "",
    icompetition: string = "",
    ilevel: string = "",
    limit: number,
  ) {
    console.log("new", ilanguage, icompetition, ilevel);
    console.log("q", q);
    if (!limit || limit > system.get("pagination.problem") || page > 1)
      limit = system.get("pagination.problem");
    console.log("Limit=", limit);
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const query = await buildQueryAll(this.user, domainId);
    // const query = await buildQuery(this.user, domainId);
    const psdict = {};
    console.log("search-defaultsearch?");
    const search = global.Hydro.lib.problemSearch || defaultSearch;
    // const search = defaultSearch;
    let sort: string[];
    let fail = false;
    let pcountRelation = "eq";
    const parsed = parser.parse(q, {
      keywords: ["category", "difficulty"],
      offsets: false,
      alwaysArray: true,
      tokenize: true,
    });
    const category = parsed.category || [];
    const text = (parsed.text || []).join(" ");
    if (parsed.difficulty?.every((i) => Number.isSafeInteger(+i))) {
      query.difficulty = { $in: parsed.difficulty.map(Number) };
    }
    if (category.length) {
      query.$and ||= [];
      query.$and.push(...category.map((tag) => ({ tag })));
    }
    if (text) category.push(text);
    if (category.length) this.UiContext.extraTitleContent = category.join(",");
    const alltags: string[] = [];
    if (ilanguage !== "N/A" && ilanguage !== "") {
      alltags.push(ilanguage);
    }
    if (icompetition !== "N/A" && icompetition !== "") {
      alltags.push(icompetition);
    }
    if (ilevel !== "N/A" && ilevel !== "") {
      alltags.push(ilevel);
    }
    console.log("alltagsxxx", alltags);
    console.log("query", query);

    if (alltags.length) {
      query.$and ||= [];
      query.$and.push(...alltags.map((tag) => ({ tag })));
    }

    let total = 0;
    console.log("query:", query);
    console.log("text", text);
    if (text) {
      const result = await search(domainId, q, {
        skip: (page - 1) * limit,
        limit,
      });
      total = result.total;
      pcountRelation = result.countRelation;
      if (!result.hits.length) fail = true;
      query.$and ||= [];
      query.$and.push({
        $or: result.hits.map((i) => {
          const [did, docId] = i.split("/");
          return { domainId: did, docId: +docId };
        }),
      });
      sort = result.hits;
    }
    await this.ctx.parallel("problem/list", query, this);
    const sortBy = "nAccept";

    // eslint-disable-next-line prefer-const
    let [pdocs, ppcount, pcount] = fail
      ? [[], 0, 0]
      : await problem.list(
          domainId,
          query,
          sort?.length ? 1 : page,
          limit,
          undefined,
          this.user._id,
        );
    if (total) {
      pcount = total;
      ppcount = Math.ceil(total / limit);
    }
    if (sort)
      pdocs = pdocs.sort(
        (a, b) =>
          sort.indexOf(`${a.domainId}/${a.docId}`) -
          sort.indexOf(`${b.domainId}/${b.docId}`),
      );
    if (q && page === 1) {
      const pdoc = await problem.get(
        domainId,
        +q || q,
        problem.PROJECTION_LIST,
      );
      if (pdoc && problem.canViewBy(pdoc, this.user)) {
        const count = pdocs.length;
        pdocs = pdocs.filter((doc) => doc.docId !== pdoc.docId);
        pdocs.unshift(pdoc);
        pcount = pcount - count + pdocs.length;
      }
    }
    console.log("PDOCS");
    console.log(pdocs);
    if (text && pcount > pdocs.length) pcount = pdocs.length;
    if (this.user.hasPriv(PRIV.PRIV_USER_PROFILE)) {
      const domainIds = Array.from(new Set(pdocs.map((i) => i.domainId)));
      await Promise.all(
        domainIds.map((did) =>
          problem
            .getListStatus(
              did,
              this.user._id,
              pdocs.filter((i) => i.domainId === did).map((i) => i.docId),
            )
            .then((res) => Object.assign(psdict, res)),
        ),
      );
    }
    this.response.body = {
      page,
      pcount,
      ppcount,
      pcountRelation,
      pdocs,
      psdict,
      qs: q,
      ilanguage: ilanguage,
      icompetition: icompetition,
      ilevel: ilevel,
    };
  }
}

export class ProblemMainTagHandler extends Handler {
  @param("page", Types.PositiveInt, true)
  @param("q", Types.Content, true)
  @param("ilanguage", Types.Content, true)
  @param("icompetition", Types.Content, true)
  @param("ilevel", Types.Content, true)
  @param("limit", Types.PositiveInt, true)
  @param("pjax", Types.Boolean)
  async get(
    domainId: string,
    page = 1,
    q = "",
    ilanguage: string = "",
    icompetition: string = "",
    ilevel: string = "",
    limit: number,
    pjax = false,
  ) {
    this.response.template = "problem_main_tag.html";
    console.log("new", ilanguage, icompetition, ilevel);
    console.log("q", q);
    if (!limit || limit > system.get("pagination.problem") || page > 1)
      limit = system.get("pagination.problem");
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const query = await buildQuery(this.user, domainId);
    const psdict = {};
    console.log("search-defaultsearch?");
    const search = global.Hydro.lib.problemSearch || defaultSearch;
    // const search = defaultSearch;
    let sort: string[];
    let fail = false;
    let pcountRelation = "eq";
    const parsed = parser.parse(q, {
      keywords: ["category", "difficulty"],
      offsets: false,
      alwaysArray: true,
      tokenize: true,
    });
    const category = parsed.category || [];
    const text = (parsed.text || []).join(" ");
    if (parsed.difficulty?.every((i) => Number.isSafeInteger(+i))) {
      query.difficulty = { $in: parsed.difficulty.map(Number) };
    }
    if (category.length) {
      query.$and ||= [];
      query.$and.push(...category.map((tag) => ({ tag })));
    }
    if (text) category.push(text);
    if (category.length) this.UiContext.extraTitleContent = category.join(",");
    const alltags: string[] = [];
    if (ilanguage !== "N/A" && ilanguage !== "") {
      alltags.push(ilanguage);
    }
    if (icompetition !== "N/A" && icompetition !== "") {
      alltags.push(icompetition);
    }
    if (ilevel !== "N/A" && ilevel !== "") {
      alltags.push(ilevel);
    }
    console.log("alltagsxxx", alltags);
    console.log("query", query);

    if (alltags.length) {
      query.$and ||= [];
      query.$and.push(...alltags.map((tag) => ({ tag })));
    }

    let total = 0;
    console.log("query:", query);
    console.log("text", text);
    if (text) {
      const result = await search(domainId, q, {
        skip: (page - 1) * limit,
        limit,
      });
      total = result.total;
      pcountRelation = result.countRelation;
      if (!result.hits.length) fail = true;
      query.$and ||= [];
      query.$and.push({
        $or: result.hits.map((i) => {
          const [did, docId] = i.split("/");
          return { domainId: did, docId: +docId };
        }),
      });
      sort = result.hits;
    }
    await this.ctx.parallel("problem/list", query, this);
    // eslint-disable-next-line prefer-const
    let [pdocs, ppcount, pcount] = fail
      ? [[], 0, 0]
      : await problem.list(
          domainId,
          query,
          sort?.length ? 1 : page,
          limit,
          undefined,
          this.user._id,
        );
    if (total) {
      pcount = total;
      ppcount = Math.ceil(total / limit);
    }
    if (sort)
      pdocs = pdocs.sort(
        (a, b) =>
          sort.indexOf(`${a.domainId}/${a.docId}`) -
          sort.indexOf(`${b.domainId}/${b.docId}`),
      );
    if (q && page === 1) {
      const pdoc = await problem.get(
        domainId,
        +q || q,
        problem.PROJECTION_LIST,
      );
      if (pdoc && problem.canViewBy(pdoc, this.user)) {
        const count = pdocs.length;
        pdocs = pdocs.filter((doc) => doc.docId !== pdoc.docId);
        pdocs.unshift(pdoc);
        pcount = pcount - count + pdocs.length;
      }
    }
    if (text && pcount > pdocs.length) pcount = pdocs.length;
    if (this.user.hasPriv(PRIV.PRIV_USER_PROFILE)) {
      const domainIds = Array.from(new Set(pdocs.map((i) => i.domainId)));
      await Promise.all(
        domainIds.map((did) =>
          problem
            .getListStatus(
              did,
              this.user._id,
              pdocs.filter((i) => i.domainId === did).map((i) => i.docId),
            )
            .then((res) => Object.assign(psdict, res)),
        ),
      );
    }
    console.log("pjax", pjax);
    if (pjax) {
      this.response.body = {
        title: this.renderTitle(this.translate("problem_main")),
        fragments: (
          await Promise.all([
            this.renderHTML("partials/problem_list.html", {
              page,
              ppcount,
              pcount,
              pdocs,
              psdict,
              qs: q,
            }),
            this.renderHTML("partials/problem_stat.html", {
              pcount,
              pcountRelation,
            }),
            this.renderHTML("partials/problem_lucky.html", { qs: q }),
          ])
        ).map((i) => ({ html: i })),
      };
    } else {
      this.response.body = {
        page,
        pcount,
        ppcount,
        pcountRelation,
        pdocs,
        psdict,
        qs: q,
        ilanguage: ilanguage,
        icompetition: icompetition,
        ilevel: ilevel,
      };
    }
  }

  @param("pid", Types.UnsignedInt)
  async postStar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, true);
    this.back({ star: true });
  }

  @param("pid", Types.UnsignedInt)
  async postUnstar(domainId: string, pid: number) {
    await problem.setStar(domainId, pid, this.user._id, false);
    this.back({ star: false });
  }

  @param("pids", Types.NumericArray)
  @param("target", Types.String)
  async postCopy(domainId: string, pids: number[], target: string) {
    const t = `,${this.domain.share || ""},`;
    if (t !== ",*," && !t.includes(`,${target},`))
      throw new PermissionError(target);
    const ddoc = await domain.get(target);
    if (!ddoc) throw new NotFoundError(target);
    const dudoc = await user.getById(target, this.user._id);
    if (!dudoc.hasPerm(PERM.PERM_CREATE_PROBLEM))
      throw new PermissionError(PERM.PERM_CREATE_PROBLEM);
    const ids = [];
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      ids.push(await problem.copy(domainId, pid, target));
    }
    this.response.body = ids;
  }

  @param("pids", Types.NumericArray)
  async postDelete(domainId: string, pids: number[]) {
    let i = 0;
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!pdoc) continue;
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.del(domainId, pid);
      i++;
      this.progress("Deleting: ({0}/{1})", [i, pids.length]);
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postHide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: true });
    }
    this.back();
  }

  @param("pids", Types.NumericArray)
  async postUnhide(domainId: string, pids: number[]) {
    for (const pid of pids) {
      // eslint-disable-next-line no-await-in-loop
      const pdoc = await problem.get(domainId, pid);
      if (!this.user.own(pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
        this.checkPerm(PERM.PERM_EDIT_PROBLEM);
      // eslint-disable-next-line no-await-in-loop
      await problem.edit(domainId, pid, { hidden: false });
    }
    this.back();
  }
}

export class ProblemRandomHandler extends Handler {
  @param("q", Types.Content, true)
  async get(domainId: string, qs = "") {
    const category = flattenDeep(
      qs
        .split(" ")
        .filter((i) => i.startsWith("category:"))
        .map((i) => i.split("category:")[1]?.split(",")),
    );
    const q = await buildQuery(this.user, domainId);
    if (category.length) q.$and = category.map((tag) => ({ tag }));
    await this.ctx.parallel("problem/list", q, this);
    const pid = await problem.random(domainId, q);
    if (!pid) throw new NoProblemError();
    this.response.body = { pid };
    this.response.redirect = this.url("problem_detail", { pid });
  }
}

export class ProblemDetailHandler extends ContestDetailBaseHandler {
  pdoc: ProblemDoc;
  udoc: User;
  psdoc: ProblemStatusDoc;

  @route("pid", Types.ProblemId, true)
  @query("tid", Types.ObjectId, true)
  @query("origin", Types.Int, true)
  async _prepare(
    domainId: string,
    pid: number | string,
    tid?: ObjectId,
    origin: number = 0,
  ) {
    // if (!this.user.own(this.pdoc, PERM.PERM_EDIT_PROBLEM_SELF)) this.checkPerm(PERM.PERM_EDIT_PROBLEM);
    this.pdoc = await problem.get(domainId, pid);
    console.log("pdoccc");
    console.log(this.pdoc);
    if (!this.pdoc) throw new ProblemNotFoundError(domainId, pid);
    const groups = (await user.listGroup(domainId, this.user._id)).map(
      (i) => i.name,
    );
    console.log("details, groups", groups);
    if (tid) {
      if (!this.tdoc?.pids?.includes(this.pdoc.docId))
        throw new ContestNotFoundError(domainId, tid);
      if (contest.isNotStarted(this.tdoc)) throw new ContestNotLiveError(tid);
      if (
        !contest.isDone(this.tdoc, this.tsdoc) &&
        (!this.tsdoc?.attend || !this.tsdoc.startAt)
      )
        throw new ContestNotAttendedError(tid);
      // Delete problem-related info in contest mode
      this.pdoc.tag.length = 0;
      delete this.pdoc.nAccept;
      delete this.pdoc.nSubmit;
      delete this.pdoc.difficulty;
      delete this.pdoc.stats;
    } else if (!problem.canViewByGroup(this.pdoc, this.user, groups)) {
      let containsPayToView = this.pdoc.assign.some((assignItem) =>
        assignItem.includes("付费查看题目"),
      );
      let containsPayToSubmit = this.pdoc.assign.some((assignItem) =>
        assignItem.includes("付费提交代码"),
      );
      console.log("contains", containsPayToView, containsPayToSubmit);
      if (containsPayToView) {
        this.response.body = { pid };
        this.response.redirect = this.url("problem_payment", { pid });
        return;
      }
      throw new PermissionError(PERM.PERM_VIEW_PROBLEM_HIDDEN);
    }
    let ddoc = this.domain;
    if (this.pdoc.reference) {
      ddoc = await domain.get(this.pdoc.reference.domainId);
      const pdoc = await problem.get(
        this.pdoc.reference.domainId,
        this.pdoc.reference.pid,
      );
      if (!ddoc || !pdoc)
        throw new ProblemNotFoundError(
          this.pdoc.reference.domainId,
          this.pdoc.reference.pid,
        );
      this.pdoc.config = pdoc.config;
      this.pdoc.additional_file = pdoc.additional_file;
    }
    if (typeof this.pdoc.config !== "string") {
      let baseLangs;
      if (this.pdoc.config.type === "remote_judge") {
        const p = this.pdoc.config.subType;
        const dl = Object.keys(setting.langs).filter(
          (i) => i.startsWith(`${p}.`) || setting.langs[i].validAs[p],
        );
        if (setting.langs[p]) dl.push(p);
        baseLangs = dl;
      } else {
        baseLangs = Object.keys(setting.langs).filter(
          (i) => !setting.langs[i].remote,
        );
      }
      const t = [];
      if (this.pdoc.config.langs) t.push(this.pdoc.config.langs);
      if (ddoc.langs)
        t.push(
          ddoc.langs
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i),
        );
      if (this.domain.langs)
        t.push(
          this.domain.langs
            .split(",")
            .map((i) => i.trim())
            .filter((i) => i),
        );
      this.pdoc.config.langs = ["objective", "submit_answer"].includes(
        this.pdoc.config.type,
      )
        ? ["_"]
        : intersection(baseLangs, ...t);
    }
    await this.ctx.parallel("problem/get", this.pdoc, this);
    [this.psdoc, this.udoc] = await Promise.all([
      problem.getStatus(domainId, this.pdoc.docId, this.user._id),
      user.getById(domainId, this.pdoc.owner),
    ]);
    const [scnt, dcnt] = await Promise.all([
      solution.count(domainId, { parentId: this.pdoc.docId }),
      discussion.count(domainId, { parentId: this.pdoc.docId }),
    ]);
    this.response.body = {
      pdoc: this.pdoc,
      udoc: this.udoc,
      psdoc: tid ? null : this.psdoc,
      title: this.pdoc.title,
      solutionCount: scnt,
      discussionCount: dcnt,
      tdoc: this.tdoc,
      owner_udoc:
        tid && this.tdoc.owner !== this.pdoc.owner
          ? await user.getById(domainId, this.tdoc.owner)
          : null,
    };
    if (this.tdoc && this.tsdoc) {
      const fields = ["attend", "startAt"];
      if (this.tdoc.duration) fields.push("endAt");
      if (contest.canShowSelfRecord.call(this, this.tdoc, true))
        fields.push("detail");
      this.tsdoc = pick(this.tsdoc, fields);
      this.response.body.tsdoc = this.tsdoc;
    }
    if (origin === 0) this.response.template = "problem_detail.html";
    else this.response.template = "problem_detail_backup.html";
    this.UiContext.extraTitleContent = this.pdoc.title;
  }

  @query("tid", Types.ObjectId, true)
  @query("pjax", Types.Boolean)
  async get(...args: any[]) {
    // Navigate to current additional file download
    // e.g. ![img](file://a.jpg) will navigate to ![img](./pid/file/a.jpg)
    if (!this.request.json || args[2]) {
      this.response.body.pdoc.content = this.response.body.pdoc.content.replace(
        /file:\/\/([^ \n)\\"]+)/g,
        (str: string) => {
          const info = str.match(/file:\/\/([^ \n)\\"]+)/);
          const fileinfo = info[1];
          let filename = fileinfo.split("?")[0]; // remove querystring
          try {
            filename = decodeURIComponent(filename);
          } catch (e) {}
          if (!this.pdoc.additional_file?.find((i) => i.name === filename))
            return str;
          if (!args[1]) return `./${this.pdoc.docId}/file/${fileinfo}`;
          return `./${this.pdoc.docId}/file/${fileinfo}${fileinfo.includes("?") ? "&" : "?"}tid=${args[1]}`;
        },
      );
    }
    this.response.body.page_name = this.tdoc
      ? this.tdoc.rule === "homework"
        ? "homework_detail_problem"
        : "contest_detail_problem"
      : "problem_detail";
    if (args[2]) {
      const data = { pdoc: this.pdoc, tdoc: this.tdoc };
      this.response.body = {
        title: this.renderTitle(this.response.body.page_name),
        fragments: [
          {
            html: await this.renderHTML(
              "partials/problem_description.html",
              data,
            ),
          },
        ],
        raw: data,
      };
    }
    if (!this.response.body.tdoc) {
      if (this.psdoc?.rid) {
        this.response.body.rdoc = await record.get(
          this.args.domainId,
          this.psdoc.rid,
        );
      }
      [this.response.body.ctdocs, this.response.body.htdocs] =
        await Promise.all([
          contest.getRelated(this.args.domainId, this.pdoc.docId),
          contest.getRelated(this.args.domainId, this.pdoc.docId, "homework"),
        ]);
    }
  }

  @param("pid", Types.UnsignedInt)
  async postRejudge(domainId: string, pid: number) {
    this.checkPerm(PERM.PERM_REJUDGE_PROBLEM);
    const rdocs = await record
      .getMulti(domainId, {
        pid,
        contest: { $nin: [record.RECORD_GENERATE, record.RECORD_PRETEST] },
        status: { $ne: STATUS.STATUS_CANCELED },
        "files.hack": { $exists: false },
      })
      .project({ _id: 1, contest: 1 })
      .toArray();
    if (!this.pdoc.config || typeof this.pdoc.config === "string")
      throw new ProblemConfigError();
    const priority = await record.submissionPriority(
      this.user._id,
      -10000 - rdocs.length * 5 - 50,
    );
    await record.reset(
      domainId,
      rdocs.map((rdoc) => rdoc._id),
      true,
    );
    await Promise.all([
      record.judge(
        domainId,
        rdocs.filter((i) => i.contest).map((i) => i._id),
        priority,
        { detail: false },
        { rejudge: true },
      ),
      record.judge(
        domainId,
        rdocs.filter((i) => !i.contest).map((i) => i._id),
        priority,
        {},
        { rejudge: true },
      ),
    ]);
    this.back();
  }

  @param("target", Types.String)
  async postCopy(domainId: string, target: string) {
    if (this.pdoc.reference)
      throw new BadRequestError("Cannot copy a referenced problem");
    const t = `,${this.domain.share || ""},`;
    if (t !== ",*," && !t.includes(`,${target},`))
      throw new PermissionError(target);
    const ddoc = await domain.get(target);
    if (!ddoc) throw new NotFoundError(target);
    const dudoc = await user.getById(target, this.user._id);
    if (!dudoc.hasPerm(PERM.PERM_CREATE_PROBLEM))
      throw new PermissionError(PERM.PERM_CREATE_PROBLEM);
    const docId = await problem.copy(domainId, this.pdoc.docId, target);
    this.response.redirect = this.url("problem_detail", {
      domainId: target,
      pid: docId,
    });
  }

  async postDelete() {
    if (!this.user.own(this.pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
      this.checkPerm(PERM.PERM_EDIT_PROBLEM);
    const tdocs = await contest.getRelated(this.args.domainId, this.pdoc.docId);
    if (tdocs.length)
      throw new ProblemAlreadyUsedByContestError(this.pdoc.docId, tdocs[0]._id);
    await problem.del(this.pdoc.domainId, this.pdoc.docId);
    this.response.redirect = this.url("problem_main");
  }
}

//题目付费：
// 1. 判断用户是否已经有这个题目的权限，如果有，那就跳转本题
// 2. 如果没有权限，那就展示付费界面
export class ProblemPaymentHandler extends ContestDetailBaseHandler {
  pdoc: ProblemDoc;
  udoc: User;
  psdoc: ProblemStatusDoc;

  @route("pid", Types.ProblemId, true)
  async get(domainId: string, pid: number | string) {
    this.pdoc = await problem.get(domainId, pid);
    const groups = (await user.listGroup(domainId, this.user._id)).map(
      (i) => i.name,
    );
    console.log("payment", domainId, pid, this.pdoc);
    if (!problem.canViewByGroup(this.pdoc, this.user, groups)) {
      let containsPayToView = this.pdoc.assign.some((assignItem) =>
        assignItem.includes("付费查看题目"),
      );
      let containsPayToSubmit = this.pdoc.assign.some((assignItem) =>
        assignItem.includes("付费提交代码"),
      );
      console.log("contains", containsPayToView, containsPayToSubmit);
      if (containsPayToView) {
        this.response.body = { pid };
        // 定义变量
        let time = new Date().getTime(); // 获取当前时间的时间戳
        let balance = 10; // 适当的值
        let action = "deposit"; // 或其他行为
        console.log("payment user", this.user._id);
        let user_id = this.user._id; // 适当的值
        let group_id = this.pdoc.assign.find((assignItem) =>
          assignItem.includes("付费查看题目"),
        ); // 适当的值
        let return_url = `https://codemate.thucode.com/p/${pid}`; // 适当的值

        let data = `${time}${balance}${action}${user_id}${group_id}${return_url}`;
        // 密钥 - 应该保持机密
        const secretKey = "your_secret_key";
        // 创建 HMAC SHA256 签名
        const crypto = require("crypto");
        let signature = crypto
          .createHmac("sha256", secretKey)
          .update(data)
          .digest("hex");
        let sign = signature; // 适当的值

        // 使用模板字符串构建 payment_url
        let payment_url = `/pay?time=${time}&balance=${balance}&action=${action}&user_id=${user_id}&group_id=${group_id}&return_url=${return_url}&sign=${sign}`;

        this.response.body = { pid, payment_url };
        this.response.template = "problem_payment.html";
        return;
      }
    } else {
      this.response.body = { pid };
      this.response.redirect = this.url("problem_detail", { pid });
    }
    // this.response.body = { };
    // this.response.template = 'problem_payment.html';
    // this.response.template = 'status.html';
  }
}

export class ProblemSubmitHandler extends ProblemDetailHandler {
  @param("tid", Types.ObjectId, true)
  async prepare(domainId: string, tid?: ObjectId) {
    if (tid && !contest.isOngoing(this.tdoc, this.tsdoc))
      throw new ContestNotLiveError(this.tdoc.docId);
    if (typeof this.pdoc.config === "string") throw new ProblemConfigError();
    if (this.pdoc.config.langs && !this.pdoc.config.langs.length)
      throw new ProblemConfigError();
  }

  async get() {
    this.response.template = "problem_submit.html";
    const langRange =
      typeof this.pdoc.config === "object" && this.pdoc.config.langs
        ? Object.fromEntries(
            this.pdoc.config.langs.map((i) => [
              i,
              setting.langs[i]?.display || i,
            ]),
          )
        : setting.SETTINGS_BY_KEY.codeLang.range;
    this.response.body.langRange = langRange;
    this.response.body.page_name = this.tdoc
      ? this.tdoc.rule === "homework"
        ? "homework_detail_problem_submit"
        : "contest_detail_problem_submit"
      : "problem_submit";
  }

  @param("lang", Types.Name)
  @param("code", Types.Content, true)
  @param("pretest", Types.Boolean)
  @param("input", Types.String, true)
  @param("tid", Types.ObjectId, true)
  async post(
    domainId: string,
    lang: string,
    code: string,
    pretest = false,
    input = "",
    tid?: ObjectId,
  ) {
    const config = this.pdoc.config;
    if (typeof config === "string" || config === null)
      throw new ProblemConfigError();
    if (["submit_answer", "objective"].includes(config.type)) {
      lang = "_";
    } else if (
      (config.langs && !config.langs.includes(lang)) ||
      !setting.langs[lang] ||
      setting.langs[lang].disabled
    ) {
      throw new ProblemNotAllowLanguageError();
    }
    if (pretest) {
      if (setting.langs[lang]?.pretest)
        lang = setting.langs[lang].pretest as string;
      if (
        !["default", "remote_judge"].includes(
          this.response.body.pdoc.config?.type,
        )
      ) {
        throw new ProblemNotAllowPretestError("type");
      }
    }
    await this.limitRate(
      "add_record",
      60,
      system.get("limit.submission_user"),
      true,
    );
    await this.limitRate(
      "add_record",
      60,
      system.get("limit.submission"),
      false,
    );
    const files: Record<string, string> = {};
    if (!code) {
      const file = this.request.files?.file;
      if (!file || file.size === 0) throw new ValidationError("code");
      const sizeLimit =
        config.type === "submit_answer" ? 128 * 1024 * 1024 : 65535;
      if (file.size > sizeLimit) throw new ValidationError("file");
      if (file.size < 65535 && !file.filepath.endsWith(".zip")) {
        // TODO auto detect & convert encoding
        // TODO submission file shape
        code = await readFile(file.filepath, "utf-8");
      } else {
        const id = nanoid();
        await storage.put(
          `submission/${this.user._id}/${id}`,
          file.filepath,
          this.user._id,
        );
        files.code = `${this.user._id}/${id}#${file.originalFilename}`;
      }
    }
    const rid = await record.add(
      domainId,
      this.pdoc.docId,
      this.user._id,
      lang,
      code,
      true,
      pretest
        ? { input, type: "pretest" }
        : { contest: tid, files, type: "judge" },
    );
    const rdoc = await record.get(domainId, rid);
    if (!pretest) {
      await Promise.all([
        problem.inc(domainId, this.pdoc.docId, "nSubmit", 1),
        problem.incStatus(
          domainId,
          this.pdoc.docId,
          this.user._id,
          "nSubmit",
          1,
        ),
        domain.incUserInDomain(domainId, this.user._id, "nSubmit"),
        tid &&
          contest.updateStatus(
            domainId,
            tid,
            this.user._id,
            rid,
            this.pdoc.docId,
          ),
      ]);
    }
    this.ctx.broadcast("record/change", rdoc);
    if (tid && !pretest && !contest.canShowSelfRecord.call(this, this.tdoc)) {
      this.response.body = { tid };
      this.response.redirect = this.url(
        this.tdoc.rule === "homework"
          ? "homework_detail"
          : "contest_problemlist",
        { tid },
      );
    } else {
      this.response.body = { rid };
      this.response.redirect = this.url("record_detail", { rid });
    }
  }
}

export class ProblemHackHandler extends ProblemDetailHandler {
  rdoc: RecordDoc;

  @param("rid", Types.ObjectId)
  @param("tid", Types.ObjectId, true)
  async prepare(domainId: string, rid: ObjectId, tid?: ObjectId) {
    if (typeof this.pdoc.config !== "object" || !this.pdoc.config.hackable)
      throw new HackFailedError("This problem is not hackable.");
    this.rdoc = await record.get(domainId, rid);
    if (
      !this.rdoc ||
      this.rdoc.pid !== this.pdoc.docId ||
      this.rdoc.contest?.toString() !== tid?.toString()
    )
      throw new RecordNotFoundError(domainId, rid);
    if (tid) {
      if (this.tdoc.rule !== "codeforces")
        throw new HackFailedError("This contest is not hackable.");
      if (!contest.isOngoing(this.tdoc, this.tsdoc))
        throw new ContestNotLiveError(this.tdoc.docId);
    }
    if (this.rdoc.uid === this.user._id)
      throw new HackFailedError("You cannot hack your own submission");
    if (this.psdoc?.status !== STATUS.STATUS_ACCEPTED)
      throw new HackFailedError("You must accept this problem before hacking.");
    if (this.rdoc.status !== STATUS.STATUS_ACCEPTED)
      throw new HackFailedError("You cannot hack a unsuccessful submission.");
  }

  async get() {
    this.response.template = "problem_hack.html";
    this.response.body = {
      pdoc: this.pdoc,
      udoc: this.udoc,
      rid: this.rdoc._id,
      title: this.pdoc.title,
      page_name: this.tdoc ? "contest_detail_problem_hack" : "problem_hack",
    };
  }

  @param("input", Types.String, true)
  @param("tid", Types.ObjectId, true)
  async post(domainId: string, input = "", tid?: ObjectId) {
    await this.limitRate(
      "add_record",
      60,
      system.get("limit.submission_user"),
      true,
    );
    await this.limitRate(
      "add_record",
      60,
      system.get("limit.submission"),
      false,
    );
    const id = `${this.user._id}/${nanoid()}`;
    if (this.request.files?.file?.size > 0) {
      const file = this.request.files.file;
      if (!file || file.size > 128 * 1024 * 1024)
        throw new ValidationError("input");
      await storage.put(`submission/${id}`, file.filepath, this.user._id);
    } else if (input) {
      await storage.put(`submission/${id}`, Buffer.from(input), this.user._id);
    }
    const rid = await record.add(
      domainId,
      this.pdoc.docId,
      this.user._id,
      this.rdoc.lang,
      this.rdoc.code,
      true,
      { contest: tid, type: "hack", files: { hack: `${id}#input.txt` } },
    );
    const rdoc = await record.get(domainId, rid);
    // TODO contest: update status;
    this.ctx.broadcast("record/change", rdoc);
    this.response.body = { rid };
    this.response.redirect = this.url("record_detail", { rid });
  }
}

export class ProblemManageHandler extends ProblemDetailHandler {
  async prepare() {
    if (!this.user.own(this.pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
      this.checkPerm(PERM.PERM_EDIT_PROBLEM);
  }
}

export class ProblemEditHandler extends ProblemManageHandler {
  async get() {
    console.log("Problem Edit Get");
    this.response.body.additional_file = sortFiles(
      this.pdoc.additional_file || [],
    );
    this.response.template = "problem_edit.html";
    console.log(this.response);
  }

  @route("pid", Types.ProblemId)
  @post("title", Types.Title)
  @post("content", Types.Content)
  @post("pid", Types.ProblemId, true, (i) => /^[a-zA-Z]+[a-zA-Z0-9]*$/i.test(i))
  @post("hidden", Types.Boolean)
  @post("tag", Types.Content, true, null, parseCategory)
  @post("difficulty", Types.PositiveInt, (i) => +i <= 10, true)
  @post("assign", Types.CommaSeperatedArray, true)
  @post("permission", Types.String, true, (value) =>
    ["public", "assign", "pay_to_view", "pay_to_submit"].includes(value),
  )
  @post("brief", Types.Content, true)
  async post(
    domainId: string,
    pid: string | number,
    title: string,
    content: string,
    newPid: string | number = "",
    hidden = false,
    tag: string[] = [],
    difficulty = 0,
    assign: string[] = [],
    permission: string = "public",
    brief: string = "",
  ) {
    if (typeof newPid !== "string") newPid = `P${newPid}`;
    console.log("problemid", this.pdoc, title);
    // 新添加的逻辑
    function generateRandomId(length) {
      let result = "";
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength),
        );
      }
      return result;
    }

    // 检查 this.pdoc.docId 是否为空，如果为空则生成随机字符串
    let docId = `[${title}]${generateRandomId(4)}`;

    const payToViewStr = `付费查看题目P${docId}组`;
    const payToSubmitStr = `付费提交代码P${docId}组`;
    if (permission === "pay_to_view" && !assign.includes(payToViewStr)) {
      assign.push(payToViewStr);
    } else if (
      permission === "pay_to_submit" &&
      !assign.includes(payToSubmitStr)
    ) {
      assign.push(payToSubmitStr);
    }
    console.log(assign);
    if (newPid !== this.pdoc.pid && (await problem.get(domainId, newPid)))
      throw new ProblemAlreadyExistError(pid);
    const $update: Partial<ProblemDoc> = {
      title,
      content,
      pid: newPid,
      hidden,
      tag: tag ?? [],
      difficulty,
      html: false,
      assign,
      brief,
    };
    const pdoc = await problem.edit(domainId, this.pdoc.docId, $update);
    this.response.redirect = this.url("problem_detail", {
      pid: newPid || pdoc.docId,
    });
  }
}

export class ProblemConfigHandler extends ProblemManageHandler {
  async get() {
    if (this.pdoc.reference) throw new ProblemIsReferencedError("edit config");
    this.response.body.testdata = sortFiles(this.pdoc.data || []);
    const configFile = (this.pdoc.data || []).filter(
      (i) => i.name.toLowerCase() === "config.yaml",
    );
    this.response.body.config = "";
    if (configFile.length > 0) {
      try {
        this.response.body.config = (
          await streamToBuffer(
            await storage.get(
              `problem/${this.pdoc.domainId}/${this.pdoc.docId}/testdata/${configFile[0].name}`,
            ),
          )
        ).toString();
      } catch (e) {
        /* ignore */
      }
    }
    this.response.template = "problem_config.html";
  }
}

export class ProblemFilesHandler extends ProblemDetailHandler {
  notUsage = true;

  @param("d", Types.CommaSeperatedArray, true)
  @param("pjax", Types.Boolean)
  @param("sidebar", Types.Boolean)
  async get(
    domainId: string,
    d = ["testdata", "additional_file"],
    pjax = false,
    sidebar = false,
  ) {
    this.response.body.testdata = d.includes("testdata")
      ? sortFiles(this.pdoc.data || [])
      : [];
    this.response.body.reference = this.pdoc.reference;
    this.response.body.additional_file = d.includes("additional_file")
      ? sortFiles(this.pdoc.additional_file || [])
      : [];
    if (pjax) {
      const { testdata, additional_file } = this.response.body;
      const owner = await user.getById(domainId, this.pdoc.owner);
      const args = {
        testdata,
        additional_file,
        pdoc: this.pdoc,
        owner_udoc: owner,
        sidebar,
        can_edit: true,
      };
      const tasks = [];
      if (d.includes("testdata"))
        tasks.push(
          this.renderHTML("partials/problem_files.html", {
            ...args,
            filetype: "testdata",
          }),
        );
      if (d.includes("additional_file"))
        tasks.push(
          this.renderHTML("partials/problem_files.html", {
            ...args,
            filetype: "additional_file",
          }),
        );
      if (!sidebar)
        tasks.push(
          this.renderHTML("partials/problem-sidebar-information.html", args),
        );
      this.response.body = {
        fragments: (await Promise.all(tasks)).map((i) => ({ html: i })),
      };
      this.response.template = "";
    } else this.response.template = "problem_files.html";
  }

  async post() {
    if (this.args.operation === "get_links") return;
    if (this.pdoc.reference) throw new ProblemIsReferencedError("edit files");
    if (!this.user.own(this.pdoc, PERM.PERM_EDIT_PROBLEM_SELF))
      this.checkPerm(PERM.PERM_EDIT_PROBLEM);
  }

  @post("files", Types.Set)
  @post("type", Types.Range(["testdata", "additional_file"]), true)
  async postGetLinks(domainId: string, files: Set<string>, type = "testdata") {
    if (type === "testdata" && !this.user.own(this.pdoc)) {
      if (this.pdoc.reference)
        throw new ProblemIsReferencedError("download testdata.");
      if (!this.user.hasPriv(PRIV.PRIV_READ_PROBLEM_DATA))
        this.checkPerm(PERM.PERM_READ_PROBLEM_DATA);
      if (this.tdoc && !contest.isDone(this.tdoc))
        throw new ContestNotEndedError(this.tdoc.domainId, this.tdoc.docId);
    }
    if (this.pdoc.reference)
      this.pdoc = await problem.get(
        this.pdoc.reference.domainId,
        this.pdoc.reference.pid,
      );
    const links = {};
    const size =
      Math.sum(
        this.pdoc[type === "testdata" ? "data" : "additional_file"]
          ?.filter((i) => files.has(i.name))
          ?.map((i) => i.size),
      ) || 0;
    await oplog.log(this, "download.problem.bulk", {
      target: Array.from(files).map(
        (file) =>
          `problem/${this.pdoc.domainId}/${this.pdoc.docId}/${type}/${file}`,
      ),
      size,
    });
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop
      links[file] = await storage.signDownloadLink(
        `problem/${this.pdoc.domainId}/${this.pdoc.docId}/${type}/${file}`,
        file,
        false,
        "user",
      );
    }
    this.response.body.links = links;
  }

  @post("filename", Types.Filename, true)
  @post("type", Types.Range(["testdata", "additional_file"]), true)
  async postUploadFile(domainId: string, filename: string, type = "testdata") {
    if (!this.request.files.file) throw new ValidationError("file");
    filename ||= this.request.files.file.originalFilename || String.random(16);
    const files = [];
    if (filename.endsWith(".zip") && type === "testdata") {
      let zip: AdmZip;
      try {
        zip = new AdmZip(this.request.files.file.filepath);
      } catch (e) {
        throw new ValidationError("zip", null, e.message);
      }
      const entries = zip.getEntries();
      for (const entry of entries) {
        if (!entry.name || entry.isDirectory) continue;
        files.push({
          type,
          name: sanitize(entry.name),
          size: entry.header.size,
          data: () => entry.getData(),
        });
      }
    } else {
      files.push({
        type,
        name: filename,
        size: statSync(this.request.files.file.filepath).size,
        data: () => this.request.files.file.filepath,
      });
    }
    if (!this.user.hasPriv(PRIV.PRIV_EDIT_SYSTEM)) {
      if (
        (this.pdoc.data?.length || 0) +
          (this.pdoc.additional_file?.length || 0) +
          files.length >=
        system.get("limit.problem_files_max")
      ) {
        throw new FileLimitExceededError("count");
      }
      const size = Math.sum(
        (this.pdoc.data || []).map((i) => i.size),
        (this.pdoc.additional_file || []).map((i) => i.size),
        files.map((i) => i.size),
      );
      if (size >= system.get("limit.problem_files_max_size")) {
        throw new FileLimitExceededError("size");
      }
    }
    for (const entry of files) {
      const method =
        entry.type === "testdata" ? "addTestdata" : "addAdditionalFile";
      // eslint-disable-next-line no-await-in-loop
      await problem[method](
        domainId,
        this.pdoc.docId,
        entry.name,
        entry.data(),
        this.user._id,
      );
    }
    this.back();
  }

  @post("files", Types.ArrayOf(Types.Filename))
  @post("newNames", Types.ArrayOf(Types.Filename))
  @post("type", Types.Range(["testdata", "additional_file"]), true)
  async postRenameFiles(
    domainId: string,
    files: string[],
    newNames: string[],
    type = "testdata",
  ) {
    if (files.length !== newNames.length)
      throw new ValidationError("files", "newNames");
    await Promise.all(
      files.map(async (file, index) => {
        const newName = newNames[index];
        if (type === "testdata")
          await problem.renameTestdata(
            domainId,
            this.pdoc.docId,
            file,
            newName,
            this.user._id,
          );
        else
          await problem.renameAdditionalFile(
            domainId,
            this.pdoc.docId,
            file,
            newName,
            this.user._id,
          );
      }),
    );
    this.back();
  }

  @post("files", Types.ArrayOf(Types.Filename))
  @post("type", Types.Range(["testdata", "additional_file"]), true)
  async postDeleteFiles(domainId: string, files: string[], type = "testdata") {
    if (type === "testdata")
      await problem.delTestdata(
        domainId,
        this.pdoc.docId,
        files,
        this.user._id,
      );
    else
      await problem.delAdditionalFile(
        domainId,
        this.pdoc.docId,
        files,
        this.user._id,
      );
    this.back();
  }

  @post("std", Types.Filename)
  @post("gen", Types.Filename)
  async postGenerateTestdata(domainId: string, std: string, gen: string) {
    if (!this.pdoc.data.find((i) => i.name === std))
      throw new BadRequestError();
    if (!this.pdoc.data.find((i) => i.name === gen))
      throw new BadRequestError();
    const rid = await record.add(
      domainId,
      this.pdoc.docId,
      this.user._id,
      "_",
      `${gen}\n${std}`,
      true,
      {
        type: "generate",
      },
    );
    this.response.redirect = this.url("record_detail", { rid });
  }
}

export class ProblemFileDownloadHandler extends ProblemDetailHandler {
  @query("type", Types.Range(["additional_file", "testdata"]), true)
  @param("filename", Types.Filename)
  @param("noDisposition", Types.Boolean)
  async get(
    domainId: string,
    type = "additional_file",
    filename: string,
    noDisposition = false,
  ) {
    if (this.pdoc.reference) {
      if (type === "testdata")
        throw new ProblemIsReferencedError("download testdata");
      this.pdoc = await problem.get(
        this.pdoc.reference.domainId,
        this.pdoc.reference.pid,
      );
      if (!this.pdoc) throw new ProblemNotFoundError();
    }
    if (type === "testdata" && !this.user.own(this.pdoc)) {
      if (!this.user.hasPriv(PRIV.PRIV_READ_PROBLEM_DATA))
        this.checkPerm(PERM.PERM_READ_PROBLEM_DATA);
      if (this.tdoc && !contest.isDone(this.tdoc))
        throw new ContestNotEndedError(this.tdoc.domainId, this.tdoc.docId);
    }
    const target = `problem/${this.pdoc.domainId}/${this.pdoc.docId}/${type}/${filename}`;
    const file = await storage.getMeta(target);
    await oplog.log(this, "download.problem.single", {
      target,
      size: file?.size || 0,
    });
    this.response.redirect = await storage.signDownloadLink(
      target,
      noDisposition ? undefined : filename,
      false,
      "user",
    );
  }
}

export class ProblemSolutionHandler extends ProblemDetailHandler {
  @param("page", Types.PositiveInt, true)
  @param("tid", Types.ObjectId, true)
  @param("sid", Types.ObjectId, true)
  @param("origin", Types.Int, true)
  async get(
    domainId: string,
    page = 1,
    tid?: ObjectId,
    sid?: ObjectId,
    origin: number = 0,
  ) {
    if (tid) throw new PermissionError(PERM.PERM_VIEW_PROBLEM_SOLUTION);
    if (origin === 0) this.response.template = "problem_solution.html";
    else this.response.template = "problem_solution_backup.html";
    const accepted = this.psdoc?.status === STATUS.STATUS_ACCEPTED;
    if (
      !accepted ||
      !this.user.hasPerm(PERM.PERM_VIEW_PROBLEM_SOLUTION_ACCEPT)
    ) {
      this.checkPerm(PERM.PERM_VIEW_PROBLEM_SOLUTION);
    }
    // eslint-disable-next-line prefer-const
    let [psdocs, pcount, pscount] = await paginate(
      solution.getMulti(domainId, this.pdoc.docId),
      page,
      system.get("pagination.solution"),
    );
    if (sid) {
      psdocs = [await solution.get(domainId, sid)];
      if (!psdocs[0]) throw new SolutionNotFoundError(domainId, sid);
    }
    const uids = [this.pdoc.owner];
    const docids = [];
    for (const psdoc of psdocs) {
      docids.push(psdoc.docId);
      uids.push(psdoc.owner);
      if (psdoc.reply.length) {
        for (const psrdoc of psdoc.reply) uids.push(psrdoc.owner);
      }
    }
    const udict = await user.getList(domainId, uids);
    const pssdict = await solution.getListStatus(
      domainId,
      docids,
      this.user._id,
    );
    console.log(
      "problem_solution_data",
      psdocs,
      page,
      pcount,
      pscount,
      udict,
      pssdict,
      this.pdoc,
      sid,
    );
    // console.log('reply_data', psdocs[0].reply)
    this.response.body = {
      psdocs,
      page,
      pcount,
      pscount,
      udict,
      pssdict,
      pdoc: this.pdoc,
      sid,
    };
  }

  @param("content", Types.Content)
  async postSubmit(domainId: string, content: string) {
    this.checkPerm(PERM.PERM_CREATE_PROBLEM_SOLUTION);
    const psid = await solution.add(
      domainId,
      this.pdoc.docId,
      this.user._id,
      content,
    );
    this.back({ psid });
  }

  @param("content", Types.Content)
  @param("psid", Types.ObjectId)
  async postEditSolution(domainId: string, content: string, psid: ObjectId) {
    let psdoc = await solution.get(domainId, psid);
    if (!this.user.own(psdoc)) this.checkPerm(PERM.PERM_EDIT_PROBLEM_SOLUTION);
    else this.checkPerm(PERM.PERM_EDIT_PROBLEM_SOLUTION_SELF);
    psdoc = await solution.edit(domainId, psdoc.docId, content);
    this.back({ psdoc });
  }

  @param("psid", Types.ObjectId)
  async postDeleteSolution(domainId: string, psid: ObjectId) {
    const psdoc = await solution.get(domainId, psid);
    if (!this.user.own(psdoc))
      this.checkPerm(PERM.PERM_DELETE_PROBLEM_SOLUTION);
    else this.checkPerm(PERM.PERM_DELETE_PROBLEM_SOLUTION_SELF);
    await solution.del(domainId, psdoc.docId);
    this.back();
  }

  @param("psid", Types.ObjectId)
  @param("content", Types.Content)
  async postReply(domainId: string, psid: ObjectId, content: string) {
    this.checkPerm(PERM.PERM_REPLY_PROBLEM_SOLUTION);
    const psdoc = await solution.get(domainId, psid);
    await solution.reply(domainId, psdoc.docId, this.user._id, content);
    this.back();
  }

  @param("psid", Types.ObjectId)
  @param("psrid", Types.ObjectId)
  @param("content", Types.Content)
  async postEditReply(
    domainId: string,
    psid: ObjectId,
    psrid: ObjectId,
    content: string,
  ) {
    const [psdoc, psrdoc] = await solution.getReply(domainId, psid, psrid);
    if (!psdoc || psdoc.parentId !== this.pdoc.docId)
      throw new SolutionNotFoundError(domainId, psid);
    if (
      !(
        this.user.own(psrdoc) &&
        this.user.hasPerm(PERM.PERM_EDIT_PROBLEM_SOLUTION_REPLY_SELF)
      )
    ) {
      throw new PermissionError(PERM.PERM_EDIT_PROBLEM_SOLUTION_REPLY_SELF);
    }
    await solution.editReply(domainId, psid, psrid, content);
    this.back();
  }

  @param("psid", Types.ObjectId)
  @param("psrid", Types.ObjectId)
  async postDeleteReply(domainId: string, psid: ObjectId, psrid: ObjectId) {
    const [psdoc, psrdoc] = await solution.getReply(domainId, psid, psrid);
    if (!psdoc || psdoc.parentId !== this.pdoc.docId)
      throw new SolutionNotFoundError(psid);
    if (
      !(
        this.user.own(psrdoc) &&
        this.user.hasPerm(PERM.PERM_DELETE_PROBLEM_SOLUTION_REPLY_SELF)
      )
    ) {
      this.checkPerm(PERM.PERM_DELETE_PROBLEM_SOLUTION_REPLY);
    }
    await solution.delReply(domainId, psid, psrid);
    this.back();
  }

  @param("psid", Types.ObjectId)
  async postUpvote(domainId: string, psid: ObjectId) {
    const [psdoc, pssdoc] = await solution.vote(
      domainId,
      psid,
      this.user._id,
      1,
    );
    this.back({ vote: psdoc.vote, user_vote: pssdoc.vote });
  }

  @param("psid", Types.ObjectId)
  async postDownvote(domainId: string, psid: ObjectId) {
    const [psdoc, pssdoc] = await solution.vote(
      domainId,
      psid,
      this.user._id,
      -1,
    );
    this.back({ vote: psdoc.vote, user_vote: pssdoc.vote });
  }
}

export class ProblemSolutionRawHandler extends ProblemDetailHandler {
  @param("psid", Types.ObjectId)
  @route("psrid", Types.ObjectId, true)
  @param("tid", Types.ObjectId, true)
  async get(
    domainId: string,
    psid: ObjectId,
    psrid?: ObjectId,
    tid?: ObjectId,
  ) {
    if (tid) throw new PermissionError(PERM.PERM_VIEW_PROBLEM_SOLUTION);
    const accepted = this.psdoc?.status === STATUS.STATUS_ACCEPTED;
    if (
      !accepted ||
      !this.user.hasPerm(PERM.PERM_VIEW_PROBLEM_SOLUTION_ACCEPT)
    ) {
      this.checkPerm(PERM.PERM_VIEW_PROBLEM_SOLUTION);
    }
    if (psrid) {
      const [psdoc, psrdoc] = await solution.getReply(domainId, psid, psrid);
      if (!psdoc || psdoc.parentId !== this.pdoc.docId)
        throw new SolutionNotFoundError(psid, psrid);
      this.response.body = psrdoc.content;
    } else {
      const psdoc = await solution.get(domainId, psid);
      this.response.body = psdoc.content;
    }
    this.response.type = "text/markdown";
  }
}

export class ProblemCreateHandler extends Handler {
  async get() {
    console.log("Problem Create");
    this.response.template = "problem_edit.html";
    this.response.body = {
      page_name: "problem_create",
      additional_file: [],
    };
    console.log(this.response.body);
  }

  @post("title", Types.Title)
  @post("content", Types.Content)
  @post("pid", Types.ProblemId, true, (i) => /^[a-zA-Z]+[a-zA-Z0-9]*$/i.test(i))
  @post("hidden", Types.Boolean)
  @post("difficulty", Types.PositiveInt, (i) => +i <= 10, true)
  @post("tag", Types.Content, true, null, parseCategory)
  @post("assign", Types.CommaSeperatedArray, true)
  @post("permission", Types.String, true, (value) =>
    ["public", "assign", "pay_to_view", "pay_to_submit"].includes(value),
  )
  @post("brief", Types.Content, true)
  async post(
    domainId: string,
    title: string,
    content: string,
    pid: string | number = "",
    hidden = false,
    difficulty = 0,
    tag: string[] = [],
    assign: string[] = [],
    permission: string = "public",
    brief: string = "",
  ) {
    console.log("Assign:", assign);
    if (typeof pid !== "string") pid = `P${pid}`;
    if (pid && (await problem.get(domainId, pid)))
      throw new ProblemAlreadyExistError(pid);

    // 新添加的逻辑
    function generateRandomId(length) {
      let result = "";
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const charactersLength = characters.length;
      for (let i = 0; i < length; i++) {
        result += characters.charAt(
          Math.floor(Math.random() * charactersLength),
        );
      }
      return result;
    }

    // 检查 this.pdoc.docId 是否为空，如果为空则生成随机字符串
    let docId1 = `[${title}]${generateRandomId(6)}`;

    const payToViewStr = `付费查看题目P${docId1}组`;
    const payToSubmitStr = `付费提交代码P${docId1}组`;
    if (permission === "pay_to_view" && !assign.includes(payToViewStr)) {
      assign.push(payToViewStr);
    } else if (
      permission === "pay_to_submit" &&
      !assign.includes(payToSubmitStr)
    ) {
      assign.push(payToSubmitStr);
    }

    const docId = await problem.add(
      domainId,
      pid,
      title,
      content,
      this.user._id,
      tag ?? [],
      {
        hidden,
        difficulty,
      },
      assign,
      brief,
    );
    const files = new Set(
      Array.from(
        content.matchAll(/file:\/\/([a-zA-Z0-9_-]+\.[a-zA-Z0-9]+)/g),
      ).map((i) => i[1]),
    );
    const tasks = [];
    for (const file of files) {
      if (this.user._files.find((i) => i.name === file)) {
        tasks.push(
          storage
            .rename(
              `user/${this.user._id}/${file}`,
              `problem/${domainId}/${docId}/additional_file/${file}`,
              this.user._id,
            )
            .then(() =>
              problem.addAdditionalFile(
                domainId,
                docId,
                file,
                "",
                this.user._id,
                true,
              ),
            ),
          user.setById(this.user._id, {
            _files: this.user._files.filter((i) => i.name !== file),
          }),
        );
      }
    }
    await Promise.all(tasks);
    this.response.body = { pid: pid || docId };
    this.response.redirect = this.url("problem_files", { pid: pid || docId });
  }
}

export class ProblemPrefixListHandler extends Handler {
  @param("prefix", Types.Name)
  async get(domainId: string, prefix: string) {
    const projection = ["domainId", "docId", "pid", "title"] as const;
    const [pdocs, pdoc, apdoc] = await Promise.all([
      problem.getPrefixList(domainId, prefix),
      problem.get(
        domainId,
        Number.isSafeInteger(+prefix) ? +prefix : prefix,
        projection,
      ),
      /^P\d+$/.test(prefix)
        ? problem.get(domainId, +prefix.substring(1), projection)
        : Promise.resolve(null),
    ]);
    if (apdoc) pdocs.unshift(apdoc);
    if (pdoc) pdocs.unshift(pdoc);
    if (pdocs.length < 20) {
      const search = global.Hydro.lib.problemSearch || defaultSearch;
      const result = await search(domainId, prefix, {
        limit: 20 - pdocs.length,
      });
      const docs = await problem
        .getMulti(domainId, {
          docId: { $in: result.hits.map((i) => +i.split("/")[1]) },
        })
        .project<ProblemDoc>(buildProjection(projection))
        .toArray();
      pdocs.push(...docs);
    }
    this.response.body = uniqBy(pdocs, "docId");
  }
}

export async function apply(ctx) {
  ctx.Route(
    "refresh_test",
    "/p-refresh-test",
    ProblemMainTestHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route("problem_main", "/p", ProblemMainHandler, PERM.PERM_VIEW_PROBLEM);
  ctx.Route(
    "problem_main_tag",
    "/p-tag",
    ProblemMainTagHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_main_api",
    "/p-tag/api",
    ProblemMainAPIHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_random",
    "/problem/random",
    ProblemRandomHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route("problem_detail", "/p/:pid", ProblemDetailHandler);
  ctx.Route("problem_payment", "/p/:pid/payment", ProblemPaymentHandler);
  ctx.Route(
    "problem_submit",
    "/p/:pid/submit",
    ProblemSubmitHandler,
    PERM.PERM_SUBMIT_PROBLEM,
  );
  ctx.Route(
    "problem_hack",
    "/p/:pid/hack/:rid",
    ProblemHackHandler,
    PERM.PERM_SUBMIT_PROBLEM,
  );
  ctx.Route("problem_edit", "/p/:pid/edit", ProblemEditHandler);
  ctx.Route("problem_config", "/p/:pid/config", ProblemConfigHandler);
  ctx.Route(
    "problem_files",
    "/p/:pid/files",
    ProblemFilesHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_file_download",
    "/p/:pid/file/:filename",
    ProblemFileDownloadHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_solution",
    "/p/:pid/solution",
    ProblemSolutionHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_solution_detail",
    "/p/:pid/solution/:sid",
    ProblemSolutionHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_solution_raw",
    "/p/:pid/solution/:psid/raw",
    ProblemSolutionRawHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_solution_reply_raw",
    "/p/:pid/solution/:psid/:psrid/raw",
    ProblemSolutionRawHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
  ctx.Route(
    "problem_create",
    "/problem/create",
    ProblemCreateHandler,
    PERM.PERM_CREATE_PROBLEM,
  );
  ctx.Route(
    "problem_prefix_list",
    "/problem/list",
    ProblemPrefixListHandler,
    PERM.PERM_VIEW_PROBLEM,
  );
}
