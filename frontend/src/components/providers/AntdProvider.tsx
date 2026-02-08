'use client';

import { ConfigProvider, theme as antTheme, App } from 'antd';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { useTheme } from 'next-themes';
import { ReactNode, useEffect, useState } from 'react';

interface AntdProviderProps {
  children: ReactNode;
}

export default function AntdProvider({ children }: AntdProviderProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = !mounted || resolvedTheme === 'dark';

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
          token: {
            colorPrimary: '#ff6b35',
            colorBgContainer: isDark ? '#141414' : '#ffffff',
            colorBgElevated: isDark ? '#0f0f0f' : '#fafafa',
            colorBorder: isDark ? '#2a2a2a' : '#e5e0db',
            colorText: isDark ? '#f5f5f5' : '#1a1a1a',
            colorTextSecondary: isDark ? '#999' : '#666',
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
              labelColor: isDark ? '#f5f5f5' : '#1a1a1a',
            },
            Tabs: {
              titleFontSize: 16,
            },
            Message: {
              contentBg: isDark ? '#1a1a1a' : '#ffffff',
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
