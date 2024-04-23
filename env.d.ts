/// <reference types="vite/client" />
import { type BaseNode } from 'sql-parser-cst'

declare module 'sql-parser-cst' {
	export interface BaseNode {
		pid?: number
	}
}

