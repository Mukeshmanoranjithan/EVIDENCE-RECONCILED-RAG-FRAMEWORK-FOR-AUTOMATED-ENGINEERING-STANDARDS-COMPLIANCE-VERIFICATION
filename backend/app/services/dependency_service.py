import networkx as nx
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

@dataclass
class ImpactedNode:
    requirement_id: str
    origin_requirement_id: str
    graph_distance: int
    dependency_type: str
    status: str # at_risk, unverifiable_upstream_dependency

class DependencyGraphService:
    def __init__(self):
        self.graph = nx.DiGraph()

    def add_dependency(self, source_req_id: str, target_req_id: str, dep_type: str = "structural", status: str = "verified"):
        """
        Edge direction: source_req_id -> target_req_id means target depends on source.
        So if source fails, target is impacted.
        """
        self.graph.add_edge(source_req_id, target_req_id, dependency_type=dep_type, status=status)

    def propagate_failures(self, failed_req_ids: List[str]) -> List[ImpactedNode]:
        """
        Traverses downstream dependencies using BFS to identify all impacted requirements.
        """
        impacted: List[ImpactedNode] = []
        visited = set()
        
        for origin_id in failed_req_ids:
            if origin_id not in self.graph:
                continue
                
            # BFS downstream
            queue = [(origin_id, 0)]
            while queue:
                curr_id, dist = queue.pop(0)
                for successor in self.graph.successors(curr_id):
                    edge_data = self.graph.get_edge_data(curr_id, successor) or {}
                    dep_type = edge_data.get("dependency_type", "structural")
                    
                    if successor not in visited and successor not in failed_req_ids:
                        visited.add(successor)
                        impacted.append(ImpactedNode(
                            requirement_id=successor,
                            origin_requirement_id=origin_id,
                            graph_distance=dist + 1,
                            dependency_type=dep_type,
                            status="unverifiable_upstream_dependency"
                        ))
                        queue.append((successor, dist + 1))
                        
        return impacted

    def get_critical_paths(self) -> List[List[str]]:
        """Identifies longest dependency paths in DAG."""
        if not nx.is_directed_acyclic_graph(self.graph):
            return []
        try:
            paths = []
            for node in self.graph.nodes():
                descendants = nx.descendants(self.graph, node)
                for desc in descendants:
                    all_p = list(nx.all_simple_paths(self.graph, node, desc))
                    paths.extend(all_p)
            paths.sort(key=len, reverse=True)
            return paths[:5]
        except Exception:
            return []

    def export_graph_for_react_flow(self) -> Dict[str, Any]:
        """Exports nodes and edges formatted for React Flow visualization."""
        nodes = []
        edges = []
        
        for n in self.graph.nodes():
            nodes.append({
                "id": n,
                "data": {"label": n},
                "position": {"x": 0, "y": 0} # layout computed by Dagre in UI
            })
            
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "id": f"e-{u}-{v}",
                "source": u,
                "target": v,
                "label": data.get("dependency_type", "depends_on"),
                "animated": True if data.get("status") == "suggested" else False,
                "data": data
            })
            
        return {"nodes": nodes, "edges": edges}

