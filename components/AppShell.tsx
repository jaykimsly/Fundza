'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AppLoader from '@/components/AppLoader';
import AppIcon from '@/components/AppIcon';

const PUBLIC_ROUTES = ['/login', '/auth', '/legal', '/landing'];
const REQUIRED_DOCUMENTS = ['terms', 'privacy', 'copyright', 'legal'] as const;
