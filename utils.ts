export const replaceVariables = (
  str: string,
  env: Record<string, any>
): string => {
  const matches = str.match(/{([^}]*)}/g);
  if (!matches?.length) return str;
  let replaced = str;
  matches.forEach((match) => {
    const variable = match.substring(1, match.length - 1);
    if (!(variable in env))
      throw new Error(`Cannot replace '${variable}': not found in env`);
    replaced = replaced.replace(match, env[variable]);
  });

  return replaced;
};
