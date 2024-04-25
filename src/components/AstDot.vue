<script lang="ts" setup>
	import { Graphviz } from '@hpcc-js/wasm/graphviz'
	import { onMounted, ref } from 'vue'
	import { ElButton } from 'element-plus'
	import {
		cstVisitor,
		parse,
		type BinaryExpr,
		type Keyword as CstKeyword,
		type PostgresqlOperatorExpr
	} from 'sql-parser-cst'

	const graphviz = ref<Graphviz | null>(null)

	onMounted(async () => {
		graphviz.value = await Graphviz.load()
	})

	const sqlStr = ref(`SELECT
		foo, bar as baz
	FROM
		mytable
	WHERE
		foo LIKE '%neat%' AND bar='aaa'
	ORDER BY
		foo DESC`)

	const svgDom = ref<HTMLDivElement>()
	const renderSvgImg = () => {
		if (graphviz.value && svgDom.value) {
			let val = ``
			const genASTNodeName = (name: string) => {
				const start = Math.floor(Math.random() * 1000000000)
				val += `${start}[label="${name}"];\n`
				return start
			}

			const gotoLine = (name: string, pid?: number) => {
				if (!pid) return
				const cid = genASTNodeName(name)
				val += `${pid}->${cid};\n`
				return cid
			}
			let cst = null
			try {
				cst = parse(sqlStr.value, {
					dialect: 'mariadb'
				})
			} catch (error) {
				alert('代码渲染错误')
				console.log('error: ', error)
			}
			if (cst === null) return
			const genAstDot = cstVisitor({
				select_stmt: ({ pid, clauses }) => {
					let cid = 0
					if (!pid) {
						cid = genASTNodeName('select_stmt')
					} else {
						cid = gotoLine('select_stmt', pid) || 0
					}
					clauses.forEach(c => (c.pid = cid))
				},
				select_clause: ({ pid, selectKw, columns }) => {
					const cid = gotoLine(selectKw.text, pid)
					columns?.items.forEach(e => (e.pid = cid))
				},
				from_clause: ({ pid, fromKw, expr }) => {
					const cid = gotoLine(fromKw.text, pid)
					expr.pid = cid
				},
				where_clause: ({ pid, whereKw, expr }) => {
					const cid = gotoLine(whereKw.text, pid)
					expr.pid = cid
				},
				order_by_clause: ({ pid, orderByKw, specifications }) => {
					const cid = gotoLine(
						orderByKw.map(k => k.text).join(' '),
						pid
					)
					specifications.items.forEach(i => (i.pid = cid))
				},
				sort_specification: ({ pid, direction, expr }) => {
					if (direction) {
						direction.pid = pid
					}
					expr.pid = pid
				},
				sort_direction_asc: ({ pid, ascKw }) => (ascKw.pid = pid),
				sort_direction_desc: ({ pid, descKw }) => (descKw.pid = pid),
				alias: ({ pid, alias, expr }) => {
					const cid = gotoLine('as', pid)
					alias.pid = cid
					expr.pid = cid
				},
				keyword: ({ pid, text }) => gotoLine(text, pid),
				identifier: ({ pid, name }) => gotoLine(name, pid),
				binary_expr: ({ pid, operator, left, right }) => {
					const cid = gotoLine(castOp(operator), pid)
					left.pid = cid
					right.pid = cid
				},
				string_literal: ({ pid, value }) => gotoLine(value, pid)
			})

			const castOp = (op: BinaryExpr['operator']): string => {
				if (typeof op === 'string') {
					return op
				}
				if (typeof (op as CstKeyword).text !== undefined) {
					return (op as CstKeyword).text
				}
				if (
					typeof (op as PostgresqlOperatorExpr).operatorKw.text !==
					undefined
				) {
					return (op as PostgresqlOperatorExpr).operatorKw.text
				}
				return ''
			}
			genAstDot(cst)
			svgDom.value.innerHTML = graphviz.value.layout(
				`digraph G { ${val} }`,
				'svg',
				'dot'
			)
		}
	}
</script>
<template>
	<div class="ast-node-container">
		<span>AST DOT</span>
		<div class="render-container">
			<div class="input-area">
				<div>
					<el-input
						v-model="sqlStr"
						style="width: 400px"
						:autosize="{ minRows: 2, maxRows: 20 }"
						type="textarea"
						placeholder="请输入SQL语句"
					/>
				</div>
				<el-button
					@click="renderSvgImg"
					style="margin-top: 10px"
					type="primary"
					>点击渲染</el-button
				>
			</div>
			<div class="render-area">
				<div ref="svgDom"></div>
			</div>
		</div>
	</div>
</template>
<style lang="scss" scoped>
	.ast-node-container {
		box-sizing: border-box;
		padding-top: 30px;
		width: 100vw;
		height: 100vh;
		display: flex;
		align-items: center;
		flex-direction: column;

		.render-container {
			width: 100vw;
			display: flex;

			.input-area {
				flex: 1;
				box-sizing: border-box;
				padding: 10px;
			}

			.render-area {
				box-sizing: border-box;
				flex: 1;
				padding: 10px;

				div {
					width: 100px;

					svg {
						width: 10px;
					}
				}
			}
		}
	}
</style>
