export function buildGroupKey(groupFields, data) {
    return groupFields
        .map((field) => {
        const val = resolveField(data, field);
        return `${field}::${String(val ?? '_Blank')}`;
    })
        .join('||');
}
export function resolveField(data, path) {
    const parts = path.split('.');
    let current = data;
    for (const part of parts) {
        if (current == null)
            return undefined;
        current = current[part];
    }
    return current;
}
export function getGroupDisplayValue(value, field) {
    if (value === null || value === undefined || value === '')
        return '_Blank';
    if (typeof value === 'object') {
        const obj = value;
        return String(obj.label ?? obj.name ?? obj.value ?? obj.id ?? JSON.stringify(value));
    }
    if (field === 'is_deleted' || field === 'deleted') {
        return value ? 'Archived' : 'Active';
    }
    const str = String(value);
    return str.charAt(0).toUpperCase() + str.slice(1);
}
export function flattenGroupTree(tree, expandedGroupKeys) {
    const result = [];
    for (const group of tree) {
        const isExpanded = expandedGroupKeys.has(group.key);
        const groupNode = {
            nodeId: `group_${group.key}`,
            rowIndex: -1,
            data: { [group.field]: group.value },
            type: 'group',
            selected: false,
            expanded: isExpanded,
            editable: false,
            level: group.level,
            parent: null,
            children: [],
            groupKey: group.key,
            groupField: group.field,
            groupValue: group.value,
            childCount: countLeafRows(group),
            aggregatedValues: group.aggregatedValues,
            height: 50,
            top: 0,
        };
        result.push(groupNode);
        if (isExpanded) {
            if (group.children.length > 0) {
                result.push(...flattenGroupTree(group.children, expandedGroupKeys));
            }
            else {
                result.push(...group.rows);
            }
            // Footer row: mirrors the group header's aggregate values below the last
            // leaf.  Only emitted when at least one column has aggFunc configured so
            // the row has meaningful content to display.
            if (group.aggregatedValues) {
                result.push({
                    nodeId: `group_footer_${group.key}`,
                    rowIndex: -1,
                    data: { [group.field]: group.value },
                    type: 'group-footer',
                    selected: false,
                    expanded: false,
                    editable: false,
                    level: group.level,
                    parent: null,
                    children: [],
                    groupKey: group.key,
                    groupField: group.field,
                    groupValue: group.value,
                    childCount: countLeafRows(group),
                    aggregatedValues: group.aggregatedValues,
                    height: 50,
                    top: 0,
                });
            }
        }
    }
    return result;
}
function countLeafRows(group) {
    if (group.children.length === 0)
        return group.rows.length;
    return group.children.reduce((sum, child) => sum + countLeafRows(child), 0);
}
//# sourceMappingURL=group-node.js.map