import { get, mapValues } from "lodash/fp";

const replaceStringVariables = (
  str: string,
  env: Record<string, any>
): string => {
  const matches = str.match(/{([^}]*)}/g);
  if (!matches?.length) return str;
  let replaced = str;
  matches.forEach((match) => {
    const variable = match.substring(1, match.length - 1);
    const value = get(variable, env)
    if (value == null)
      throw new Error(`Cannot replace '${variable}': not found in env`);
    replaced = replaced.replace(match, value);
  });

  return replaced;
};

export const replaceVariables = <T>(
  value: T,
  env: Record<string, any>
): T => {
  if (Array.isArray(value)) return value.map(item => replaceVariables(item, env)) as T
  if (typeof value === "string") return replaceStringVariables(value, env) as T
  if (typeof value === "object")
    return mapValues(
      (val) => replaceVariables(val, env),
      value
    ) as T
  return value
}
