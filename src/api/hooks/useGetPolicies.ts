import {useQuery} from "@tanstack/react-query";

export function useGetPolicies(network: string, account: string) {
  const url =
    "https://api.welldonestudio.io/compiler/verification/aptos/packages";
  const query = `chainId=${network}&account=${account}`;
  return useQuery(
    ["get-policies", query],
    async () => {
      const res = await fetch(`${url}?${query}`, {method: "GET"});
      return res.json();
    },
    {enabled: true},
  );
}
