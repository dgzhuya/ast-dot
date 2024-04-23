<script lang="ts" setup>
	import { Graphviz } from '@hpcc-js/wasm/graphviz'
	import { onMounted, ref } from 'vue'
	import { ElButton } from 'element-plus'
	import {
		cstVisitor,
		parse,
		type BaseNode,
		type SelectClause
	} from 'sql-parser-cst'

	const graphviz = ref<Graphviz | null>(null)

	onMounted(async () => {
		graphviz.value = await Graphviz.load()
	})

	const sqlStr = ref(
		"SELECT foo, bar as baz FROM mytable WHERE foo LIKE '%neat%' ORDER BY foo DESC"
	)

	type GenResult = [string, number]

	const svgDom = ref<HTMLDivElement>()
	const renderSvgImg = () => {
		if (graphviz.value && svgDom.value) {
			let val = ``
			const genASTNodeName = (name: string) => {
				const start = Math.floor(Math.random() * 1000000000)
				val += `${start}[label="${name}"];\n`
				return start
			}

			const gotoLine = (name: string, pid: number) => {
				const cid = genASTNodeName(name)
				val += `${pid}->${cid};\n`
				return cid
			}
			const cst = parse(sqlStr.value, {
				dialect: 'mariadb'
			})
			const toUpper = cstVisitor({
				select_stmt: node => {
					const pid = genASTNodeName('select_stmt')
					for (const clause of node.clauses) {
						clause.pid = pid
					}
				},
				select_clause: ({ pid, type, columns }) => {
					console.log('columns: ', columns)
					if (!pid) return
					const cid = gotoLine(type, pid)
				},
				from_clause: ({ pid, type }) => {
					if (!pid) return
					const cid = gotoLine(type, pid)
				},
				where_clause: ({ pid, type }) => {
					if (!pid) return
					gotoLine(type, pid)
				},
				order_by_clause: ({ pid, type }) => {
					if (!pid) return
					gotoLine(type, pid)
				},
				binary_expr: node => {}
			})
			toUpper(cst)
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
