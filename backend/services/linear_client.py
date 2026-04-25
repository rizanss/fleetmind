"""
LinearClient interface with production (REST API) and mock implementations.
All Linear operations are fire-and-forget — exceptions are always silenced.
"""
from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod

import httpx

from backend.schemas.route import LinearTicketPayload

logger = logging.getLogger(__name__)

LINEAR_GRAPHQL_URL = "https://api.linear.app/graphql"

_CREATE_ISSUE_MUTATION = """
mutation CreateIssue($title: String!, $description: String!, $teamId: String!, $priority: Int!) {
  issueCreate(input: {
    title: $title
    description: $description
    teamId: $teamId
    priority: $priority
  }) {
    success
    issue { id url }
  }
}
"""


class LinearClient(ABC):
    @abstractmethod
    async def create_ticket(self, payload: LinearTicketPayload) -> None:
        """Create a Linear ticket. Must never raise — silent-fail by contract."""
        ...


class ProductionLinearClient(LinearClient):
    """
    Calls the Linear GraphQL API using LINEAR_API_KEY from environment.
    All exceptions caught and logged — never propagated to caller.
    """

    def __init__(self, api_key: str | None = None, team_id: str | None = None) -> None:
        self._api_key = api_key or os.getenv("LINEAR_API_KEY", "")
        self._team_id = team_id or os.getenv("LINEAR_TEAM_ID", "")

    async def create_ticket(self, payload: LinearTicketPayload) -> None:
        if not self._api_key:
            logger.warning("LINEAR_API_KEY not set — skipping ticket creation for anomaly %s", payload.anomaly_id)
            return

        if not self._team_id:
            logger.warning("LINEAR_TEAM_ID not set — skipping ticket creation for anomaly %s", payload.anomaly_id)
            return

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    LINEAR_GRAPHQL_URL,
                    headers={
                        "Authorization": self._api_key,
                        "Content-Type": "application/json",
                    },
                    json={
                        "query": _CREATE_ISSUE_MUTATION,
                        "variables": {
                            "title": payload.title,
                            "description": payload.description,
                            "teamId": self._team_id,
                            "priority": 1,  # Urgent
                        },
                    },
                )
                data = response.json()
                if data.get("data", {}).get("issueCreate", {}).get("success"):
                    issue_url = data["data"]["issueCreate"]["issue"]["url"]
                    logger.info("Linear ticket created: %s (anomaly=%s)", issue_url, payload.anomaly_id)
                else:
                    errors = data.get("errors", [])
                    logger.error("Linear ticket creation failed: %s", errors)
        except Exception as exc:
            logger.error("Linear API call failed (anomaly=%s): %s", payload.anomaly_id, exc)


class MockLinearClient(LinearClient):
    """
    In-memory mock for testing. Records all create_ticket calls.
    Optionally raises on call to test error-isolation paths.
    """

    def __init__(self, *, raise_on_call: bool = False) -> None:
        self.calls: list[LinearTicketPayload] = []
        self._raise_on_call = raise_on_call

    async def create_ticket(self, payload: LinearTicketPayload) -> None:
        if self._raise_on_call:
            raise RuntimeError("Mock Linear failure")
        self.calls.append(payload)
