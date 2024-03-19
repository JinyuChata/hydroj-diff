import { ConfigProvider, ConfigProviderProps } from "antd";
import React from "react";
import { ApolloClient, InMemoryCache, ApolloProvider } from "@apollo/client";

type AntdThemeProviderProps = ConfigProviderProps["theme"];

export const antdCommonTheme: AntdThemeProviderProps = {
  token: {
    colorPrimary: "#FF7D37",
    colorPrimaryBorder: "#FFFFFF",
  },
  components: {
    Tabs: {
      inkBarColor: "#FF7D37",
      itemActiveColor: "#FF7D37",
      itemHoverColor: "#FF7D37",
      itemSelectedColor: "#FF7D37",
    },
    Table: {
      headerColor: "#797979",
      cellFontSize: 14,
    },
    Form: {
      labelColor: "#797979",
    },
    Progress: {
      defaultColor: "#FF7D37",
    },
  },
};

const client = new ApolloClient({
  uri: "/api",
  cache: new InMemoryCache(),
});

const CommonWrapper: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <ConfigProvider theme={antdCommonTheme}>
      <ApolloProvider client={client}>{children}</ApolloProvider>
    </ConfigProvider>
  );
};

export default CommonWrapper;
