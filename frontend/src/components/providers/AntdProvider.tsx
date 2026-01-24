'use client';

import { ConfigProvider, theme, App } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ReactNode } from 'react';

interface AntdProviderProps {
  children: ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimary: '#ff6b35',
            colorBgContainer: '#1a1a1a',
            colorBgElevated: '#141414',
            colorBorder: '#404040',
            colorText: '#f5f5f5',
            colorTextSecondary: '#999',
            borderRadius: 12,
            fontSize: 16,
            fontFamily: 'var(--font-inter)',
          },
          components: {
            Button: {
              controlHeight: 44,
              fontWeight: 500,
            },
            Input: {
              controlHeight: 44,
              paddingBlock: 12,
              paddingInline: 16,
            },
            Form: {
              labelFontSize: 15,
              labelColor: '#f5f5f5',
            },
            Tabs: {
              titleFontSize: 16,
            },
            Message: {
              contentBg: '#1a1a1a',
              contentPadding: '12px 16px',
            },
          },
        }}
      >
        <App>
          {children}
        </App>
      </ConfigProvider>
    </AntdRegistry>
  );
}
