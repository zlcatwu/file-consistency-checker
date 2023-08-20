export type CheckCmdOptions = {
  config: string;
};

export type CheckConfig = {
  checkingMaps: Record<string, CheckMapItem>;
  output?: string;
};
export type CheckMapItem = {
  base: string;
  correspond: Record<string, string>;
  includeFn: IncludeFn;
  excludeFn: ExcludeFn;
};
type IncludeFn = (params: IncludeFnParams) => boolean;
type IncludeFnParams = {
  relativeFilepath: string;
};
type ExcludeFn = (params: ExcludeFnParams) => boolean;
type ExcludeFnParams = () => {
  relativeFilepath: string;
  hash: string;
};

export type CheckOutput = Record<string, CheckMapItemOutput>;
export type CheckMapItemOutput = Record<string, CheckMapItemFileOutput>;
export type CheckMapItemFileOutput = {
  base: {
    hash: string;
  };
  correspond: Record<
    string,
    {
      hash: string;
      baseHash: string;
    } | null
  >;
};
